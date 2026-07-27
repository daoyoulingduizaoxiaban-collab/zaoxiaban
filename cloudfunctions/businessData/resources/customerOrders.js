const {
  GROUP_ORDER_STATUS,
  MEMBER_ORDER_STATUS,
  STATUS_TEXT,
  nowIso,
  sameId,
  trimText,
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
  hasOnlyDurableAssetUrls,
} = require("../lib/core");

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

const appendPaymentHistory = async (order, nextStatus, note, profile, payload = {}) => {
  const history = {
    customerOrderId: order.id || order._id,
    fromStatus: Number(order.status),
    toStatus: Number(nextStatus),
    actorUserId: profile.id,
    actorOpenId: profile.openId,
    actorName: profile.displayName || '',
    actorRole: profile.role,
    amount: Number(payload.confirmedAmount || payload.declaredAmount || order.totalPrice || 0),
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
  const hasPaymentMethod = Boolean(trimText(payload.paymentMethod));
  const hasPaymentProof = Array.isArray(payload.paymentProofUrls) && payload.paymentProofUrls.length > 0;
  if (hasPaymentMethod !== hasPaymentProof) return '付款方式与付款凭证需同时填写';
  return '';
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
    const groupOrder = await getById('groupOrders', groupOrderId);
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

    const createdAt = nowIso();
    const hasInitialPayment = Boolean(trimText(payload.paymentMethod))
      && Array.isArray(payload.paymentProofUrls)
      && payload.paymentProofUrls.length > 0;
    const initialStatus = hasInitialPayment ? MEMBER_ORDER_STATUS.PAID : MEMBER_ORDER_STATUS.UNPAID;
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
      totalPrice: Number(payload.totalPrice || 0),
      originalTotalPrice: Number(payload.totalPrice || 0),
      items: payload.items || [],
      productList: payload.items || [],
      memberRemark: payload.memberRemark || '',
      paymentMethod: payload.paymentMethod || '',
      paymentRemark: payload.paymentRemark || '',
      paymentProofUrls: payload.paymentProofUrls || [],
      declaredAmount: hasInitialPayment ? Number(payload.declaredAmount || payload.totalPrice || 0) : '',
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
      payload,
    );
    orderWithId.paymentHistory = [history];
    await getCollection('customerOrders').doc(created._id).update({ data: { paymentHistory: [history] } });
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
    if (nextStatusValue === MEMBER_ORDER_STATUS.PAID && !isCustomerOwner && !isOwnerOrAdmin(profile)) {
      return failure('只有下单客户可以声明已付款');
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
    if (nextStatusValue === MEMBER_ORDER_STATUS.PAID) {
      const hasProof = Array.isArray(paymentProofUrls) && paymentProofUrls.length > 0;
      const declaredAmountValue = Number(declaredAmount || 0);
      if (declaredAmountValue <= 0) return failure('请填写有效付款金额');
      if (declaredAmountValue > Number(target.totalPrice || 0)) return failure('付款金额不能超过订单金额');
      if (!trimText(paymentMethod)) return failure('请填写付款方式');
      if (!hasProof) return failure('请上传付款凭证');
      if (!hasOnlyDurableAssetUrls(paymentProofUrls)) return failure('请重新上传付款凭证后提交');
    }
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED && Number(confirmedAmount || 0) <= 0) {
      return failure('请填写有效实收金额');
    }
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED) {
      const targetDeclaredAmount = Number(target.declaredAmount || 0);
      const maxPayableAmount = targetDeclaredAmount > 0 ? targetDeclaredAmount : Number(target.totalPrice || 0);
      if (maxPayableAmount > 0 && Number(confirmedAmount || 0) > maxPayableAmount) {
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
      declaredAmount: declaredAmount || target.declaredAmount || '',
      confirmedAmount: confirmedAmount || target.confirmedAmount || '',
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

    return success(updated);
  },
};


module.exports = customerOrderActions;
