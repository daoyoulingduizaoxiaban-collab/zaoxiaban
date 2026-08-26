const {
  PRODUCT_STATUS,
  GROUP_ORDER_STATUS,
  nowIso,
  sameId,
  trimText,
  normalizeShareToken,
  parseExpiryTime,
  buildShareToken,
  buildShareExpiresAt,
  buildCustomerEntryPath,
  hasAnyRole,
  getCollection,
  toId,
  toUpdateData,
  success,
  failure,
  assertApprovedProfile,
  canManageGroupOrder,
  canViewGroupOrder,
  getAllActive,
  getById,
  buildChanges,
  logOperation,
  filterKeyword,
} = require("../lib/core");

const GROUP_ORDER_FIELD_MAP = {
  title: '名称',
  description: '描述',
  startAt: '出团时间',
  endAt: '收单截止',
  customerNotice: '客户提示',
  status: { label: '收单状态', format: value => (Number(value) === GROUP_ORDER_STATUS.STOPPED ? '停止收单' : '开放收单') },
};

const getVisibleUserIds = groupOrder => [
  groupOrder.guideUserId,
  ...(groupOrder.authorizedGuideIds || []),
];

// 开团内嵌新增商品(#8)不经过 products.js，得在这里补同一道价格档防呆：
// 第一档必须是 1 件基准价，之后每档数量、总价都要比上一档大。
const validatePriceTiers = (priceSetting, productTitle) => {
  const rules = Array.isArray(priceSetting) ? priceSetting : [];
  if (!rules.length) return `请为「${productTitle || '商品'}」设置价格`;
  if (Number(rules[0].minQuantity) !== 1) return `「${productTitle || '商品'}」第一档价格必须是 1 件的基准价`;
  for (let i = 1; i < rules.length; i += 1) {
    const prev = rules[i - 1];
    const cur = rules[i];
    if (Number(cur.minQuantity) <= Number(prev.minQuantity)) return `「${productTitle || '商品'}」价格档数量必须逐档递增`;
    const prevTotal = prev.totalPrice != null ? Number(prev.totalPrice) : Number(prev.minQuantity) * Number(prev.unitPrice || 0);
    const curTotal = cur.totalPrice != null ? Number(cur.totalPrice) : Number(cur.minQuantity) * Number(cur.unitPrice || 0);
    if (curTotal <= prevTotal) return `「${productTitle || '商品'}」价格档总价必须逐档递增`;
  }
  return '';
};

const validateNewProducts = (products = []) => {
  const invalid = products
    .map(product => validatePriceTiers(product.priceSetting || product.priceSettings, product.title))
    .find(error => error);
  return invalid || '';
};

const normalizeGroupOrderPayload = (payload, profile, existing = {}) => ({
  ...existing,
  ...payload,
  ownerUserId: existing.ownerUserId || payload.ownerUserId || profile.id,
  ownerOpenId: existing.ownerOpenId || profile.openId,
  guideUserId: payload.guideUserId || existing.guideUserId || profile.id,
  guideOpenId: existing.guideOpenId || profile.openId,
  title: String(payload.title || existing.title || '').trim(),
  description: String(payload.description || existing.description || '').trim(),
  status: Number(payload.status || existing.status || GROUP_ORDER_STATUS.OPEN),
  qrCodeUrl: payload.qrCodeUrl || existing.qrCodeUrl || '',
  sharePath: payload.sharePath || existing.sharePath || '',
  shareToken: payload.shareToken || existing.shareToken || '',
  shareExpiresAt: payload.shareExpiresAt || existing.shareExpiresAt || '',
  startAt: payload.startAt || existing.startAt || '',
  endAt: payload.endAt || existing.endAt || '',
  pickupNote: payload.pickupNote || existing.pickupNote || '',
  paymentNote: payload.paymentNote || existing.paymentNote || '',
  contactName: payload.contactName || existing.contactName || profile.displayName || '',
  contactPhone: payload.contactPhone || existing.contactPhone || profile.phone || '',
  customerNotice: payload.customerNotice || existing.customerNotice || '',
  productList: payload.productList || existing.productList || [],
  memberOrderList: existing.memberOrderList || [],
  authorizedGuideIds: payload.authorizedGuideIds || existing.authorizedGuideIds || [],
  authorizedGuideOpenIds: payload.authorizedGuideOpenIds || existing.authorizedGuideOpenIds || [],
  deletedAt: existing.deletedAt || '',
});

const validateGroupOrderPayload = (groupOrder) => {
  if (!trimText(groupOrder.title)) return '请输入团单名称';
  if (trimText(groupOrder.title).length > 20) return '团单名称最多 20 个字';
  if (trimText(groupOrder.description).length > 200) return '团单描述最多 200 个字';
  if (!trimText(groupOrder.startAt)) return '请输入出团或活动时间';
  if (!trimText(groupOrder.endAt)) return '请输入收单截止时间';
  // 决策 10：开始不得晚于结束。前端 sub-pages/groupOrder/add 有同一条，这里是权威版本。
  // 两边都解不出时间就不挡（旧资料格式各异，宁可放行也不要让人存不了）。
  const startTime = parseExpiryTime(groupOrder.startAt);
  const endTime = parseExpiryTime(groupOrder.endAt);
  if (startTime && endTime && startTime > endTime) return '出团时间不能晚于收单截止时间';
  // 取货/付款/联系人/联系电话 4 栏位已按需求移除（不再必填）。
  return '';
};

const syncGroupOrderProducts = async (groupOrder, products, actorProfile) => {
  await Promise.all((products || []).map(product => getCollection('groupOrderProducts').add({
    data: {
      groupOrderId: groupOrder.id || groupOrder._id,
      productId: product.id || product._id,
      priceSnapshot: product.priceSetting || product.priceSettings || [],
      titleSnapshot: product.title || '',
      status: Number(product.status || PRODUCT_STATUS.PUBLISHED),
      sortOrder: Number(product.sortOrder || 0),
      createdByUserId: actorProfile.id,
      createdByOpenId: actorProfile.openId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: '',
    },
  })));
};

const groupOrderActions = {
  async listVisible({ keyword = '', status = 0 }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    const all = await getAllActive('groupOrders');
    const visibilityResults = await Promise.all(all.map(async order => ({
      order,
      visible: await canViewGroupOrder(order, profile),
    })));
    const visible = visibilityResults.filter(item => item.visible).map(item => item.order);
    const statusValue = Number(status || 0);
    const statusFiltered = statusValue ? visible.filter(order => Number(order.status) === statusValue) : visible;
    return success(filterKeyword(statusFiltered, keyword, ['title', 'description']));
  },

  async getById({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    const groupOrder = await getById('groupOrders', id);
    if (!await canViewGroupOrder(groupOrder, profile)) return failure('当前角色不能查看此团单');
    return success(groupOrder);
  },

  async create(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    if (!hasAnyRole(profile, ['guide', 'owner', 'admin'])) return failure('当前角色不能新建团单');
    const createdAt = nowIso();
    const shareToken = normalizeShareToken(payload.shareToken || buildShareToken());
    const shareExpiresAt = payload.shareExpiresAt || buildShareExpiresAt(payload.endAt || createdAt);
    const groupOrder = normalizeGroupOrderPayload({
      ...payload,
      shareToken,
      shareExpiresAt,
      createdAt,
      updatedAt: createdAt,
    }, profile);
    const validationError = validateGroupOrderPayload(groupOrder);
    if (validationError) return failure(validationError);
    const productsError = validateNewProducts(groupOrder.productList);
    if (productsError) return failure(productsError);
    const result = await getCollection('groupOrders').add({ data: groupOrder });
    const sharePath = buildCustomerEntryPath(result._id, shareToken);
    await getCollection('groupOrders').doc(result._id).update({ data: { sharePath } });
    const created = toId({ ...groupOrder, _id: result._id, sharePath });
    await syncGroupOrderProducts(created, created.productList, profile);
    await logOperation({
      profile, resourceType: 'groupOrder', resourceId: created.id, resourceTitle: created.title,
      action: 'create', actionText: '开团',
      visibleUserIds: getVisibleUserIds(created),
    });
    return success(created);
  },

  async update({ id, data }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    const target = await getById('groupOrders', id);
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能编辑此团单');
    const shareToken = normalizeShareToken(data.shareToken || target.shareToken || buildShareToken());
    const shareExpiresAt = normalizeShareToken(data.shareExpiresAt) || target.shareExpiresAt || buildShareExpiresAt(data.endAt || target.endAt);
    const sharePath = buildCustomerEntryPath(target._id || target.id, shareToken);
    const updated = normalizeGroupOrderPayload({
      ...data,
      shareToken,
      shareExpiresAt,
      sharePath,
      updatedAt: nowIso(),
    }, profile, target);
    const validationError = validateGroupOrderPayload(updated);
    if (validationError) return failure(validationError);
    await getCollection('groupOrders').doc(String(target._id || target.id)).update({ data: toUpdateData(updated) });
    await logOperation({
      profile, resourceType: 'groupOrder', resourceId: target._id || target.id, resourceTitle: updated.title,
      action: 'update', actionText: '编辑团单',
      changes: buildChanges(target, updated, GROUP_ORDER_FIELD_MAP),
      visibleUserIds: getVisibleUserIds(target),
    });
    return success(toId({ ...updated, _id: target._id || target.id }));
  },

  // 删除团单（软删）：仅本团管理者；前端负责双重确认与「未收款订单」提醒。
  async remove({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    const target = await getById('groupOrders', id);
    if (!target) return failure('未找到团单');
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能删除此团单');
    const deletedAt = nowIso();
    await getCollection('groupOrders').doc(String(target._id || target.id)).update({ data: { deletedAt, updatedAt: deletedAt } });
    await logOperation({
      profile, resourceType: 'groupOrder', resourceId: target._id || target.id, resourceTitle: target.title,
      action: 'remove', actionText: '删除团单',
      visibleUserIds: getVisibleUserIds(target),
    });
    return success({ id: target._id || target.id });
  },

  async addProducts({ groupOrderId, products = [] }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    const target = await getById('groupOrders', groupOrderId);
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能管理本团商品');
    const existingIds = (target.productList || []).map(product => String(product.id || product._id));
    const newlyAdded = products.filter(product => !existingIds.includes(String(product.id || product._id)));
    const productsError = validateNewProducts(newlyAdded);
    if (productsError) return failure(productsError);
    const nextProducts = [...(target.productList || []), ...newlyAdded];
    const updatedAt = nowIso();
    await getCollection('groupOrders').doc(String(target._id || target.id)).update({
      data: { productList: nextProducts, updatedAt },
    });
    await syncGroupOrderProducts(target, products, profile);
    if (newlyAdded.length) {
      await logOperation({
        profile, resourceType: 'groupOrder', resourceId: target._id || target.id, resourceTitle: target.title,
        action: 'update', actionText: '本团新增商品',
        changes: [{ field: 'productList', label: '商品', before: '', after: newlyAdded.map(p => p.title).join('、') }],
        visibleUserIds: getVisibleUserIds(target),
      });
    }
    return success(toId({ ...target, productList: nextProducts, updatedAt }));
  },

  async removeProduct({ groupOrderId, productId }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    const target = await getById('groupOrders', groupOrderId);
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能移除本团商品');
    const removedProduct = (target.productList || []).find(product => sameId(product.id || product._id, productId));
    const nextProducts = (target.productList || []).filter(product => !sameId(product.id || product._id, productId));
    const updatedAt = nowIso();
    await getCollection('groupOrders').doc(String(target._id || target.id)).update({
      data: { productList: nextProducts, updatedAt },
    });
    const relations = await getCollection('groupOrderProducts')
      .where({ groupOrderId: target.id || target._id, productId })
      .limit(100)
      .get();
    await Promise.all((relations.data || []).map(item => getCollection('groupOrderProducts').doc(item._id).update({
      data: { deletedAt: updatedAt, updatedAt },
    })));
    await logOperation({
      profile, resourceType: 'groupOrder', resourceId: target._id || target.id, resourceTitle: target.title,
      action: 'update', actionText: '本团移除商品',
      changes: [{ field: 'productList', label: '商品', before: (removedProduct && removedProduct.title) || '', after: '' }],
      visibleUserIds: getVisibleUserIds(target),
    });
    return success(toId({ ...target, productList: nextProducts, updatedAt }));
  },
};


module.exports = groupOrderActions;
