const {
  PRODUCT_STATUS,
  GROUP_ORDER_STATUS,
  nowIso,
  sameId,
  trimText,
  normalizeShareToken,
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
  filterKeyword,
} = require("../lib/core");

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
    const result = await getCollection('groupOrders').add({ data: groupOrder });
    const sharePath = buildCustomerEntryPath(result._id, shareToken);
    await getCollection('groupOrders').doc(result._id).update({ data: { sharePath } });
    const created = toId({ ...groupOrder, _id: result._id, sharePath });
    await syncGroupOrderProducts(created, created.productList, profile);
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
    return success(toId({ ...updated, _id: target._id || target.id }));
  },

  async addProducts({ groupOrderId, products = [] }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    const target = await getById('groupOrders', groupOrderId);
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能管理本团商品');
    const existingIds = (target.productList || []).map(product => String(product.id || product._id));
    const nextProducts = [
      ...(target.productList || []),
      ...products.filter(product => !existingIds.includes(String(product.id || product._id))),
    ];
    const updatedAt = nowIso();
    await getCollection('groupOrders').doc(String(target._id || target.id)).update({
      data: { productList: nextProducts, updatedAt },
    });
    await syncGroupOrderProducts(target, products, profile);
    return success(toId({ ...target, productList: nextProducts, updatedAt }));
  },

  async removeProduct({ groupOrderId, productId }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    const target = await getById('groupOrders', groupOrderId);
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能移除本团商品');
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
    return success(toId({ ...target, productList: nextProducts, updatedAt }));
  },
};


module.exports = groupOrderActions;
