const {
  GROUP_ORDER_STATUS,
  MEMBER_ORDER_STATUS,
  STATUS_TEXT,
  nowIso,
  sameId,
  trimText,
  toAmount,
  hasRole,
  getEffectiveRoles,
  getCollection,
  toId,
  toUpdateData,
  success,
  failure,
  isOwnerOrAdmin,
  assertApprovedProfile,
  canManageGroupOrder,
  canViewGroupOrder,
  getShareAccessError,
  getAllActive,
  getById,
  buildChanges,
  logOperation,
  getOptimalComboPrice,
  hasOnlyDurableAssetUrls,
} = require("../lib/core");

const ORDER_ACTION_TEXT = {
  [MEMBER_ORDER_STATUS.PAID]: '客户声明付款',
  [MEMBER_ORDER_STATUS.CONFIRMED]: '确认收款',
  [MEMBER_ORDER_STATUS.CANCELLED]: '取消订单',
};

const normalizeOrder = order => ({
  ...order,
  id: order.id || order._id,
  status: Number(order.status),
  paymentStatus: Number(order.paymentStatus !== undefined ? order.paymentStatus : order.status),
  statusText: order.statusText || STATUS_TEXT[Number(order.status)] || '未知状态',
  items: order.items || order.productList || [],
  productList: order.productList || order.items || [],
  paymentHistory: order.paymentHistory || [],
  paymentMethod: order.paymentMethod || '',
  paymentRemark: order.paymentRemark || '',
  paymentProofUrls: order.paymentProofUrls || [],
  declaredAmount: order.declaredAmount || '',
  confirmedAmount: order.confirmedAmount || '',
  confirmRemark: order.confirmRemark || '',
  cancelRemark: order.cancelRemark || '',
  customerPhone: order.customerPhone || '',
  customerName: order.customerName || '客户',
  totalPrice: Number(order.totalPrice || 0),
  originalTotalPrice: Number(order.originalTotalPrice || order.totalPrice || 0),
});

const canManageOrder = async (order, profile) => {
  if (!profile || !order) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (!getEffectiveRoles(profile).includes('guide')) return false;
  const groupOrder = await getById('groupOrders', order.groupOrderId);
  return canManageGroupOrder(groupOrder, profile);
};

const canViewOrder = async (order, profile) => {
  if (!profile || !order) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (hasRole(profile, 'customer')) return sameId(order.customerOpenId, profile.openId);
  return canManageOrder(order, profile);
};

// amount 只取「与本次状态转移相关」的那个金额，且必须是已校验的数——
// 原本 confirmedAmount 排第一顺位却在 PAID 转移时没人校验，带任意值就能在历史留一笔假金额。
const historyAmountOf = (nextStatus, payload = {}, order = {}) => {
  const pick = nextStatus === MEMBER_ORDER_STATUS.CONFIRMED ? payload.confirmedAmount : payload.declaredAmount;
  const value = toAmount(pick);
  return Number.isFinite(value) && value > 0 ? value : Number(order.totalPrice || 0);
};

const appendPaymentHistory = async (order, nextStatus, note, profile, payload = {}) => {
  const history = {
    customerOrderId: order.id || order._id,
    fromStatus: Number(order.status),
    toStatus: Number(nextStatus),
    actorUserId: profile.id,
    actorOpenId: profile.openId,
    actorName: profile.displayName || '',
    actorRole: profile.role,
    amount: historyAmountOf(nextStatus, payload, order),
    paymentMethod: trimText(payload.paymentMethod) || order.paymentMethod || '',
    proofCount: Array.isArray(payload.paymentProofUrls) && payload.paymentProofUrls.length
      ? payload.paymentProofUrls.length
      : ((order.paymentProofUrls || []).length || 0),
    note,
    createdAt: nowIso(),
  };
  const result = await getCollection('paymentStatusHistory').add({ data: history });
  return toId({ ...history, _id: result._id });
};

const validateCustomerOrderPayload = (payload) => {
  if (!payload.groupOrderId) return '缺少团单 ID';
  if (!trimText(payload.customerName)) return '请输入客户姓名';
  const phone = trimText(payload.customerPhone);
  if (!phone) return '请输入客户手机号';
  if (!/^1[3-9]\d{9}$/.test(phone)) return '请输入 11 位中国大陆手机号';
  if (!Array.isArray(payload.items) || payload.items.length === 0) return '请至少选择一个商品';
  const invalidItem = payload.items.find(item => Number(item.amount || item.quantity || 0) <= 0 || Number(item.totalPrice || 0) <= 0);
  if (invalidItem) return '商品数量和金额必须大于 0';
  if (Number(payload.totalPrice || 0) <= 0) return '订单金额必须大于 0';
  // A6：付款凭证选填，不能因为没传图就挡住「已付款+填了付款方式」的声明。
  return '';
};

// 下单金额绝对不能只信任客户端算出来的数字：拿团单快照里的 priceSetting 重新用最优组合算一遍，
// 客户端传的 totalPrice/unitPrice 全部丢弃改用这里算出来的。
const recomputeOrderItems = (items, productList) => {
  const products = productList || [];
  const results = (items || []).map((item) => {
    const product = products.find(p => sameId(p.id || p._id, item.productId));
    if (!product) return { error: `未找到商品「${item.title || item.productId}」，请刷新后重新下单` };
    const amount = Number(item.amount || 0);
    if (amount <= 0) return { error: '商品数量必须大于 0' };
    const totalPrice = getOptimalComboPrice(product.priceSetting || product.priceSettings, amount);
    if (totalPrice == null) return { error: `商品「${product.title}」价格设置无效，请联系团主检查` };
    return {
      item: {
        ...item,
        title: product.title,
        unitPrice: Math.round((totalPrice / amount) * 100) / 100,
        totalPrice,
        originalTotalPrice: totalPrice,
      },
    };
  });
  const failed = results.find(result => result.error);
  if (failed) return { error: failed.error };
  const recomputedItems = results.map(result => result.item);
  return { items: recomputedItems, totalPrice: recomputedItems.reduce((sum, item) => sum + item.totalPrice, 0) };
};

const customerOrderActions = {
  async listVisible(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    const orders = (await getAllActive('customerOrders')).map(normalizeOrder);
    const visibilityResults = await Promise.all(orders.map(async order => ({
      order,
      visible: await canViewOrder(order, profile),
    })));
    const visible = visibilityResults.filter(item => item.visible).map(item => item.order);
    return success(visible);
  },

  async listByGroupOrder({ groupOrderId }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    const groupOrder = await getById('groupOrders', groupOrderId);
    if (!await canViewGroupOrder(groupOrder, profile)) return failure('当前角色不能查看此团单订单');
    const orders = (await getAllActive('customerOrders'))
      .filter(order => sameId(order.groupOrderId, groupOrderId))
      .filter(order => !hasRole(profile, 'customer') || sameId(order.customerOpenId, profile.openId))
      .map(normalizeOrder);
    return success(orders);
  },

  async getById({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    const rawOrder = await getById('customerOrders', id);
    if (!rawOrder) return failure('未找到订单资料');
    const order = normalizeOrder(rawOrder);
    if (!await canViewOrder(order, profile)) return failure('未找到订单资料');
    return success(order);
  },

  async getGroupOrderEntry({ groupOrderId, shareToken = '' }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    let groupOrder = groupOrderId ? await getById('groupOrders', groupOrderId) : null;
    if (!groupOrder && trimText(shareToken)) {
      // 扫小程序码进团只带得动一个 scene(=shareToken)，无 groupOrderId 时按 token 反查（token 唯一）。
      const result = await getCollection('groupOrders').where({ shareToken: trimText(shareToken) }).limit(1).get();
      const doc = (result.data || []).find(item => !item.deletedAt);
      groupOrder = doc ? toId(doc) : null;
    }
    if (!await canViewGroupOrder(groupOrder, profile)) return failure('当前角色不能进入此团单');
    if (hasRole(profile, 'customer')) {
      const shareAccessError = getShareAccessError(groupOrder, profile, shareToken);
      if (shareAccessError) return failure(shareAccessError);
    }
    return success(groupOrder);
  },

  async create(payload, profile) {
    assertApprovedProfile(profile, ['customer', 'owner', 'admin']);
    if (!hasRole(profile, 'customer') && !isOwnerOrAdmin(profile)) return failure('当前角色不能提交客户订单');
    const validationError = validateCustomerOrderPayload(payload);
    if (validationError) return failure(validationError);
    if (!hasOnlyDurableAssetUrls(payload.paymentProofUrls || [])) {
      return failure('请重新上传付款凭证后提交');
    }
    const groupOrder = await getById('groupOrders', payload.groupOrderId);
    if (!groupOrder) return failure('未找到团单');
    const shareAccessError = getShareAccessError(groupOrder, profile, payload.shareToken);
    if (shareAccessError) return failure(shareAccessError);
    if (Number(groupOrder.status) !== GROUP_ORDER_STATUS.OPEN) return failure('当前团单已停止收单');

    const recomputed = recomputeOrderItems(payload.items, groupOrder.productList);
    if (recomputed.error) return failure(recomputed.error);

    const createdAt = nowIso();
    // A6：付款凭证选填，判断"是否已付款声明"只看有没有填付款方式，不強制要求凭证图。
    const hasInitialPayment = Boolean(trimText(payload.paymentMethod));
    const initialStatus = hasInitialPayment ? MEMBER_ORDER_STATUS.PAID : MEMBER_ORDER_STATUS.UNPAID;
    // 申报额不信任前端送的值：夹到服务端重算的订单金额以内，没送或送非正数就取订单金额。
    // 否则客户可虚报一个巨额申报值，把后面「确认收款」的上限撑大（该上限取 declaredAmount 优先，
    // 见 updatePaymentStatus），团单「已收」统计随之被灌水。与 updatePaymentStatus 的
    // 「付款金额不能超过订单金额」同口径。
    const declaredAmountInput = Number(payload.declaredAmount || 0);
    const declaredAmountValue = declaredAmountInput > 0
      ? Math.min(declaredAmountInput, recomputed.totalPrice)
      : recomputed.totalPrice;
    const order = normalizeOrder({
      groupOrderId: groupOrder.id || groupOrder._id,
      guideUserId: groupOrder.guideUserId,
      guideOpenId: groupOrder.guideOpenId,
      customerUserId: profile.id,
      customerOpenId: profile.openId,
      customerName: payload.customerName || profile.displayName || '客户',
      customerPhone: payload.customerPhone || profile.phone || '',
      title: `${groupOrder.title} - ${payload.customerName || profile.displayName || '客户'}`,
      status: initialStatus,
      paymentStatus: initialStatus,
      totalPrice: recomputed.totalPrice,
      originalTotalPrice: recomputed.totalPrice,
      items: recomputed.items,
      productList: recomputed.items,
      memberRemark: payload.memberRemark || '',
      paymentMethod: payload.paymentMethod || '',
      paymentRemark: payload.paymentRemark || '',
      paymentProofUrls: payload.paymentProofUrls || [],
      declaredAmount: hasInitialPayment ? declaredAmountValue : '',
      hostRemark: '',
      createdAt,
      updatedAt: createdAt,
      deletedAt: '',
      paymentHistory: [],
    });
    const created = await getCollection('customerOrders').add({ data: order });
    const orderWithId = normalizeOrder({ ...order, _id: created._id });
    const history = await appendPaymentHistory(
      orderWithId,
      initialStatus,
      hasInitialPayment ? '客户提交订单并声明已付款' : '客户提交订单',
      profile,
      // 传夹逼后的申报额，不是客户送来的原始值——否则订单上的金额是对的，
      // 付款历史那笔却还记着虚报值，并且会显示给团主看。
      { ...payload, declaredAmount: declaredAmountValue },
    );
    orderWithId.paymentHistory = [history];
    await getCollection('customerOrders').doc(created._id).update({ data: { paymentHistory: [history] } });
    await logOperation({
      profile, resourceType: 'customerOrder', resourceId: created._id, resourceTitle: orderWithId.title,
      action: 'create', actionText: '客户下单',
      visibleUserIds: orderWithId.guideUserId ? [orderWithId.guideUserId] : [],
    });
    return success(orderWithId);
  },

  async updatePaymentStatus({
    id,
    nextStatus,
    note,
    paymentMethod = '',
    paymentRemark = '',
    paymentProofUrls = [],
    declaredAmount = '',
    confirmedAmount = '',
    confirmRemark = '',
    cancelRemark = '',
  }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    const rawTarget = await getById('customerOrders', id);
    if (!rawTarget) return failure('未找到订单资料');
    const target = normalizeOrder(rawTarget);

    const nextStatusValue = Number(nextStatus);
    const isCustomerOwner = hasRole(profile, 'customer') && sameId(target.customerOpenId, profile.openId);
    const isManager = await canManageOrder(target, profile);
    // 允许团主/管理层替客户登记付款（比如客户是线下/微信转账给团主，没走 app 内声明）；
    // 之前只放行 owner/admin，团主反而不行——团主才是真正天天在处理自己团单收款的人。
    if (nextStatusValue === MEMBER_ORDER_STATUS.PAID && !isCustomerOwner && !isManager) {
      return failure('只有下单客户或团主可以登记付款');
    }
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED && !isManager) return failure('当前角色不能处理此订单');
    if (nextStatusValue === MEMBER_ORDER_STATUS.CANCELLED && !isManager && !isCustomerOwner) {
      return failure('当前角色不能取消此订单');
    }
    if (Number(target.status) === MEMBER_ORDER_STATUS.CONFIRMED && nextStatusValue !== MEMBER_ORDER_STATUS.CONFIRMED) {
      return failure('已确认订单不能再变更状态');
    }
    if (Number(target.status) === MEMBER_ORDER_STATUS.CANCELLED) return failure('已取消订单不能再变更状态');
    if (nextStatusValue === MEMBER_ORDER_STATUS.PAID && Number(target.status) === MEMBER_ORDER_STATUS.PAID) {
      return failure('订单已声明付款，请等待确认');
    }
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED && Number(target.status) !== MEMBER_ORDER_STATUS.PAID) {
      return failure('只有客户已付款订单才能确认到账');
    }
    // 两个金额一律先转数，且**只采用与本次状态转移相关的那一个**。
    // 否则做确认收款时带一个没人校验的申报额进来，会直接覆盖订单上已校验的值
    // （上限比对用的是资料库里的旧值，挡不到），付款历史也会记到未校验的数。
    const declaredAmountValue = toAmount(declaredAmount);
    const confirmedAmountValue = toAmount(confirmedAmount);
    if (nextStatusValue === MEMBER_ORDER_STATUS.PAID) {
      const hasProof = Array.isArray(paymentProofUrls) && paymentProofUrls.length > 0;
      if (!Number.isFinite(declaredAmountValue) || declaredAmountValue <= 0) return failure('请填写有效付款金额');
      if (declaredAmountValue > Number(target.totalPrice || 0)) return failure('付款金额不能超过订单金额');
      if (!trimText(paymentMethod)) return failure('请填写付款方式');
      // A6：付款凭证选填，没图不得阻止声明（线下现金/转账常常没有截图）。
      if (hasProof && !hasOnlyDurableAssetUrls(paymentProofUrls)) return failure('请重新上传付款凭证后提交');
    }
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED) {
      if (!Number.isFinite(confirmedAmountValue) || confirmedAmountValue <= 0) {
        return failure('请填写有效实收金额');
      }
      const targetDeclaredAmount = Number(target.declaredAmount || 0);
      const maxPayableAmount = targetDeclaredAmount > 0 ? targetDeclaredAmount : Number(target.totalPrice || 0);
      if (maxPayableAmount > 0 && confirmedAmountValue > maxPayableAmount) {
        return failure(targetDeclaredAmount > 0 ? '实收金额不能超过申报金额' : '实收金额不能超过订单金额');
      }
    }

    const updatedAt = nowIso();
    const history = await appendPaymentHistory(target, nextStatusValue, note, profile, {
      paymentMethod,
      paymentProofUrls,
      declaredAmount,
      confirmedAmount,
    });
    const updated = normalizeOrder({
      ...target,
      status: nextStatusValue,
      paymentStatus: nextStatusValue,
      statusText: STATUS_TEXT[nextStatusValue],
      updatedAt,
      cancelledAt: nextStatusValue === MEMBER_ORDER_STATUS.CANCELLED ? updatedAt : target.cancelledAt,
      paymentMethod: trimText(paymentMethod) || target.paymentMethod || '',
      paymentRemark: trimText(paymentRemark) || target.paymentRemark || '',
      paymentProofUrls: Array.isArray(paymentProofUrls) && paymentProofUrls.length ? paymentProofUrls : (target.paymentProofUrls || []),
      declaredAmount: nextStatusValue === MEMBER_ORDER_STATUS.PAID && Number.isFinite(declaredAmountValue)
        ? declaredAmountValue
        : (target.declaredAmount || ''),
      confirmedAmount: nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED && Number.isFinite(confirmedAmountValue)
        ? confirmedAmountValue
        : (target.confirmedAmount || ''),
      confirmRemark: trimText(confirmRemark) || target.confirmRemark || '',
      cancelRemark: trimText(cancelRemark) || target.cancelRemark || '',
      paymentHistory: [...(target.paymentHistory || []), history],
    });

    await getCollection('customerOrders').doc(String(target._id || target.id)).update({ data: toUpdateData(updated) });

    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED) {
      await getCollection('payments').add({
        data: {
          customerOrderId: target.id || target._id,
          groupOrderId: target.groupOrderId,
          amount: Number(target.totalPrice || 0),
          declaredAmount: Number(updated.declaredAmount || target.totalPrice || 0),
          confirmedAmount: Number(confirmedAmount || target.totalPrice || 0),
          method: paymentMethod || target.paymentMethod || 'manual',
          status: 'confirmed',
          confirmedByUserId: profile.id,
          confirmedByOpenId: profile.openId,
          confirmedAt: updatedAt,
          note: confirmRemark || note || '团主确认收款',
          createdAt: updatedAt,
          updatedAt,
        },
      });
    }

    await logOperation({
      profile, resourceType: 'customerOrder', resourceId: target._id || target.id, resourceTitle: updated.title,
      action: 'update', actionText: ORDER_ACTION_TEXT[nextStatusValue] || '处理客户订单',
      changes: buildChanges(target, updated, { status: { label: '状态', format: value => STATUS_TEXT[Number(value)] || '未知状态' } }),
      visibleUserIds: updated.guideUserId ? [updated.guideUserId] : [],
    });
    return success(updated);
  },
};


module.exports = customerOrderActions;
