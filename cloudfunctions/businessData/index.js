const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const COLLECTIONS = [
  'users',
  'providers',
  'products',
  'groupOrders',
  'groupOrderProducts',
  'customerOrders',
  'payments',
  'paymentStatusHistory',
];

const PRODUCT_STATUS = {
  UNPUBLISHED: 1,
  PUBLISHED: 2,
};

const INTERNAL_PRODUCT_COPY_RE = /QA|mock|Seed|MVP|local|test|automation|自动化|测试|本地|后续|未完成|暂未|未开放|未启用|未串接/i;

const GROUP_ORDER_STATUS = {
  OPEN: 1,
  STOPPED: 2,
};

const MEMBER_ORDER_STATUS = {
  UNPAID: 0,
  PAID: 1,
  CONFIRMED: 2,
  CANCELLED: 3,
};

const REVIEW_STATUS = {
  PENDING: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISABLED: 'disabled',
};

const STATUS_TEXT = {
  [MEMBER_ORDER_STATUS.UNPAID]: '未付款',
  [MEMBER_ORDER_STATUS.PAID]: '客户付款',
  [MEMBER_ORDER_STATUS.CONFIRMED]: '已确认',
  [MEMBER_ORDER_STATUS.CANCELLED]: '已取消',
};

const nowIso = () => new Date().toISOString();
const sameId = (a, b) => String(a) === String(b);
const trimText = value => String(value || '').trim();
const normalizeReviewStatus = status => (status === 'active' ? REVIEW_STATUS.APPROVED : (status || REVIEW_STATUS.PENDING));
const getCollection = name => db.collection(name);
const toId = doc => ({ ...doc, id: doc.id || doc._id });
const toUpdateData = (doc) => {
  const { _id, id, ...data } = doc;
  return data;
};
const success = (data, extra = {}) => ({
  success: true,
  data,
  meta: {
    saveMode: 'wechat-cloud-repository',
    ...extra,
  },
});
const failure = error => ({ success: false, error });
const PUBLIC_THROW_MESSAGES = new Set([
  '请先完成微信登录',
  '当前账号尚未通过管理员审核',
  '当前账号没有此操作权限',
]);
const toPublicError = (err) => {
  const message = err && err.message ? err.message : '';
  return PUBLIC_THROW_MESSAGES.has(message) ? message : '资料服务暂时不可用，请稍后再试';
};

const ensureCollections = async () => {
  await Promise.all(COLLECTIONS.map(async (name) => {
    try {
      await db.createCollection(name);
    } catch (err) {
      const message = err && (err.message || err.errMsg || err.toString());
      if (!/exist|exists|already|已存在/i.test(message || '')) throw err;
    }
  }));
};

const getCurrentProfile = async () => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  if (!openId) return null;

  const result = await db.collection('users').where({ openId }).limit(1).get();
  const profile = result.data && result.data[0];
  if (!profile) return null;

  return {
    ...profile,
    id: profile._id,
    openId,
    role: profile.role || 'guide',
    status: normalizeReviewStatus(profile.reviewStatus || profile.status),
    reviewStatus: normalizeReviewStatus(profile.reviewStatus || profile.status),
  };
};

const isOwnerOrAdmin = profile => (
  profile && (profile.role === 'owner' || profile.role === 'admin')
);

const assertProfile = (profile) => {
  if (!profile) throw new Error('请先完成微信登录');
};

const assertApprovedProfile = (profile, allowedRoles = []) => {
  assertProfile(profile);
  if (normalizeReviewStatus(profile.reviewStatus || profile.status) !== REVIEW_STATUS.APPROVED) {
    throw new Error('当前账号尚未通过管理员审核');
  }
  if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
    throw new Error('当前账号没有此操作权限');
  }
};

const canManageProduct = (product, profile) => {
  if (!profile || !product) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role === 'guide') return sameId(product.ownerOpenId, profile.openId);
  if (profile.role === 'provider') return sameId(product.providerId, profile.providerId || profile.id);
  return false;
};

const canViewProduct = (product, profile) => {
  if (!profile || !product || product.deletedAt) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role === 'guide') {
    return product.visibility === 'public' || sameId(product.ownerOpenId, profile.openId);
  }
  if (profile.role === 'provider') return sameId(product.providerId, profile.providerId || profile.id);
  return false;
};

const canManageGroupOrder = (groupOrder, profile) => {
  if (!profile || !groupOrder) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role !== 'guide') return false;
  const authorizedOpenIds = groupOrder.authorizedGuideOpenIds || [];
  const authorizedUserIds = groupOrder.authorizedGuideIds || [];
  return sameId(groupOrder.guideOpenId, profile.openId)
    || sameId(groupOrder.guideUserId, profile.id)
    || authorizedOpenIds.some(id => sameId(id, profile.openId))
    || authorizedUserIds.some(id => sameId(id, profile.id));
};

const canViewGroupOrder = async (groupOrder, profile) => {
  if (!groupOrder || groupOrder.deletedAt) return false;
  if (!profile) return false;
  if (canManageGroupOrder(groupOrder, profile)) return true;
  if (profile.role === 'customer') {
    if (Number(groupOrder.status) === GROUP_ORDER_STATUS.OPEN) return true;
    const orderResult = await getCollection('customerOrders')
      .where({ groupOrderId: groupOrder.id || groupOrder._id, customerOpenId: profile.openId })
      .limit(1)
      .get();
    return Boolean(orderResult.data && orderResult.data.length);
  }
  return false;
};

const getAllActive = async (collectionName) => {
  const result = await getCollection(collectionName).limit(100).get();
  return (result.data || []).filter(item => !item.deletedAt).map(toId);
};

const getById = async (collectionName, id) => {
  if (!id) return null;
  try {
    const result = await getCollection(collectionName).doc(String(id)).get();
    return result.data ? toId(result.data) : null;
  } catch (err) {
    const result = await getCollection(collectionName).where({ id }).limit(1).get();
    return result.data && result.data[0] ? toId(result.data[0]) : null;
  }
};

const filterKeyword = (list, keyword, fields) => {
  const query = String(keyword || '').trim().toLowerCase();
  if (!query) return list;
  return list.filter(item => fields.some(field => String(item[field] || '').toLowerCase().includes(query)));
};

const isDurableAssetUrl = url => (
  !url || /^cloud:\/\//.test(String(url)) || /^https:\/\//.test(String(url))
);

const hasOnlyDurableAssetUrls = urls => (urls || []).every(isDurableAssetUrl);

const normalizeProductPayload = (payload, profile, existing = {}) => ({
  ...existing,
  ...payload,
  ownerUserId: existing.ownerUserId || payload.ownerUserId || profile.id,
  ownerOpenId: existing.ownerOpenId || profile.openId,
  visibility: payload.visibility || existing.visibility || 'public',
  title: String(payload.title || existing.title || '').trim(),
  description: String(payload.description || existing.description || '').trim(),
  pictureUrls: payload.pictureUrls || existing.pictureUrls || [],
  priceSetting: payload.priceSetting || payload.priceSettings || existing.priceSetting || [],
  priceSettings: payload.priceSetting || payload.priceSettings || existing.priceSettings || [],
  providerId: payload.providerId || existing.providerId || (profile.role === 'provider' ? (profile.providerId || profile.id) : ''),
  sourceNote: String(payload.sourceNote || existing.sourceNote || '').trim(),
  status: Number(payload.status || existing.status || PRODUCT_STATUS.PUBLISHED),
  deletedAt: existing.deletedAt || '',
});

const validateProductPayload = (product) => {
  if (!trimText(product.title)) return '请输入商品名称';
  if (!trimText(product.description)) return '请输入商品描述';
  if (!trimText(product.sourceNote)) return '请输入供应来源或备注';
  if ([product.title, product.description, product.sourceNote].some(value => INTERNAL_PRODUCT_COPY_RE.test(String(value || '')))) {
    return '商品资料不能包含内部测试文字';
  }
  if (!Array.isArray(product.pictureUrls) || product.pictureUrls.length === 0) return '请至少上传一张商品图片';
  if (!Array.isArray(product.priceSetting) || product.priceSetting.length === 0) return '请至少设置一组价格';
  const invalidRule = product.priceSetting.find(rule => Number(rule.minQuantity) <= 0 || Number(rule.unitPrice) <= 0);
  if (invalidRule) return '价格规则需包含有效起订量和单价';
  return '';
};

const productActions = {
  async listVisible({ keyword = '', status = 0 }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const products = (await getAllActive('products')).filter(product => canViewProduct(product, profile));
    const statusValue = Number(status || 0);
    const statusFiltered = statusValue ? products.filter(product => Number(product.status) === statusValue) : products;
    return success(filterKeyword(statusFiltered, keyword, ['title', 'description', 'sourceNote']));
  },

  async create(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    if (!['guide', 'owner', 'admin', 'provider'].includes(profile.role)) return failure('当前角色不能新增商品');
    if (!hasOnlyDurableAssetUrls(payload.pictureUrls || [])) {
      return failure('请重新上传商品图片后保存');
    }
    const createdAt = nowIso();
    const product = normalizeProductPayload({
      ...payload,
      createdAt,
      updatedAt: createdAt,
    }, profile);
    const validationError = validateProductPayload(product);
    if (validationError) return failure(validationError);
    const result = await getCollection('products').add({ data: product });
    return success(toId({ ...product, _id: result._id }));
  },

  async updateStatus({ id, status }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const product = await getById('products', id);
    if (!canManageProduct(product, profile)) return failure('当前角色不能修改此商品');
    const updatedAt = nowIso();
    await getCollection('products').doc(String(product._id || product.id)).update({
      data: { status: Number(status), updatedAt },
    });
    return success({ ...product, status: Number(status), updatedAt });
  },

  async update(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const product = await getById('products', payload.id);
    if (!canManageProduct(product, profile)) return failure('当前角色不能修改此商品');
    if (!hasOnlyDurableAssetUrls(payload.pictureUrls || [])) {
      return failure('请重新上传商品图片后保存');
    }
    const updatedAt = nowIso();
    const updateData = normalizeProductPayload({
      ...payload,
      id: product.id || product._id,
      updatedAt,
    }, profile, product);
    const validationError = validateProductPayload(updateData);
    if (validationError) return failure(validationError);
    await getCollection('products').doc(String(product._id || product.id)).update({ data: toUpdateData(updateData) });
    return success(toId({ ...product, ...updateData }));
  },

  async softDelete({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const product = await getById('products', id);
    if (!canManageProduct(product, profile)) return failure('当前角色不能删除此商品');
    const deletedAt = nowIso();
    await getCollection('products').doc(String(product._id || product.id)).update({
      data: { status: PRODUCT_STATUS.UNPUBLISHED, updatedAt: deletedAt, deletedAt },
    });
    return success({ ...product, status: PRODUCT_STATUS.UNPUBLISHED, updatedAt: deletedAt, deletedAt });
  },
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
  if (!trimText(groupOrder.pickupNote)) return '请输入取货/交付/集合说明';
  if (!trimText(groupOrder.paymentNote)) return '请输入付款方式或付款备注';
  if (!trimText(groupOrder.contactName)) return '请输入导游/领队联系人';
  if (!trimText(groupOrder.contactPhone)) return '请输入联系电话';
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
    if (!['guide', 'owner', 'admin'].includes(profile.role)) return failure('当前角色不能新建团单');
    const createdAt = nowIso();
    const groupOrder = normalizeGroupOrderPayload({
      ...payload,
      createdAt,
      updatedAt: createdAt,
    }, profile);
    const validationError = validateGroupOrderPayload(groupOrder);
    if (validationError) return failure(validationError);
    const result = await getCollection('groupOrders').add({ data: groupOrder });
    const sharePath = `/pages/customerOrders/edit/index?groupOrderId=${result._id}`;
    await getCollection('groupOrders').doc(result._id).update({ data: { sharePath } });
    const created = toId({ ...groupOrder, _id: result._id, sharePath });
    await syncGroupOrderProducts(created, created.productList, profile);
    return success(created);
  },

  async update({ id, data }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin']);
    const target = await getById('groupOrders', id);
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能编辑此团单');
    const updated = normalizeGroupOrderPayload({
      ...data,
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
  if (profile.role !== 'guide') return false;
  const groupOrder = await getById('groupOrders', order.groupOrderId);
  return canManageGroupOrder(groupOrder, profile);
};

const canViewOrder = async (order, profile) => {
  if (!profile || !order) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role === 'customer') return sameId(order.customerOpenId, profile.openId);
  return canManageOrder(order, profile);
};

const appendPaymentHistory = async (order, nextStatus, note, profile) => {
  const history = {
    customerOrderId: order.id || order._id,
    fromStatus: Number(order.status),
    toStatus: Number(nextStatus),
    actorUserId: profile.id,
    actorOpenId: profile.openId,
    actorRole: profile.role,
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
      .filter(order => profile.role !== 'customer' || sameId(order.customerOpenId, profile.openId))
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

  async getGroupOrderEntry({ groupOrderId }, profile) {
    assertApprovedProfile(profile, ['customer', 'owner', 'admin']);
    const groupOrder = await getById('groupOrders', groupOrderId);
    if (!await canViewGroupOrder(groupOrder, profile)) return failure('当前角色不能进入此团单');
    return success(groupOrder);
  },

  async create(payload, profile) {
    assertApprovedProfile(profile, ['customer', 'owner', 'admin']);
    if (profile.role !== 'customer' && !isOwnerOrAdmin(profile)) return failure('当前角色不能提交客户订单');
    const validationError = validateCustomerOrderPayload(payload);
    if (validationError) return failure(validationError);
    if (!hasOnlyDurableAssetUrls(payload.paymentProofUrls || [])) {
      return failure('请重新上传付款凭证后提交');
    }
    const groupOrder = await getById('groupOrders', payload.groupOrderId);
    if (!groupOrder) return failure('未找到团单');
    if (Number(groupOrder.status) !== GROUP_ORDER_STATUS.OPEN) return failure('当前团单已停止收单');

    const createdAt = nowIso();
    const order = normalizeOrder({
      groupOrderId: groupOrder.id || groupOrder._id,
      guideUserId: groupOrder.guideUserId,
      guideOpenId: groupOrder.guideOpenId,
      customerUserId: profile.id,
      customerOpenId: profile.openId,
      customerName: payload.customerName || profile.displayName || '客户',
      customerPhone: payload.customerPhone || profile.phone || '',
      title: `${groupOrder.title} - ${payload.customerName || profile.displayName || '客户'}`,
      status: MEMBER_ORDER_STATUS.UNPAID,
      paymentStatus: MEMBER_ORDER_STATUS.UNPAID,
      totalPrice: Number(payload.totalPrice || 0),
      originalTotalPrice: Number(payload.totalPrice || 0),
      items: payload.items || [],
      productList: payload.items || [],
      memberRemark: payload.memberRemark || '',
      paymentMethod: payload.paymentMethod || '',
      paymentRemark: payload.paymentRemark || '',
      paymentProofUrls: payload.paymentProofUrls || [],
      hostRemark: '',
      createdAt,
      updatedAt: createdAt,
      deletedAt: '',
      paymentHistory: [],
    });
    const created = await getCollection('customerOrders').add({ data: order });
    const orderWithId = normalizeOrder({ ...order, _id: created._id });
    const history = await appendPaymentHistory(orderWithId, MEMBER_ORDER_STATUS.UNPAID, '客户提交订单', profile);
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
    confirmedAmount = '',
    confirmRemark = '',
    cancelRemark = '',
  }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin']);
    const rawTarget = await getById('customerOrders', id);
    if (!rawTarget) return failure('未找到订单资料');
    const target = normalizeOrder(rawTarget);

    const nextStatusValue = Number(nextStatus);
    const isCustomerOwner = profile.role === 'customer' && sameId(target.customerOpenId, profile.openId);
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
      if (!trimText(paymentMethod)) return failure('请填写付款方式');
      if (!hasProof) return failure('请上传付款凭证');
      if (!hasOnlyDurableAssetUrls(paymentProofUrls)) return failure('请重新上传付款凭证后提交');
    }
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED && Number(confirmedAmount || 0) <= 0) {
      return failure('请填写有效实收金额');
    }
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED && Number(confirmedAmount || 0) > Number(target.totalPrice || 0)) {
      return failure('实收金额不能超过订单金额');
    }

    const updatedAt = nowIso();
    const history = await appendPaymentHistory(target, nextStatusValue, note, profile);
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
          confirmedAmount: Number(confirmedAmount || target.totalPrice || 0),
          method: paymentMethod || target.paymentMethod || 'manual',
          status: 'confirmed',
          confirmedByUserId: profile.id,
          confirmedByOpenId: profile.openId,
          confirmedAt: updatedAt,
          note: confirmRemark || note || '导游确认收款',
          createdAt: updatedAt,
          updatedAt,
        },
      });
    }

    return success(updated);
  },
};

const normalizeDirectoryUser = (payload, existing = {}) => ({
  ...existing,
  displayName: trimText(payload.displayName || payload.name || existing.displayName || existing.name),
  name: trimText(payload.name || payload.displayName || existing.name || existing.displayName),
  phone: trimText(payload.phone || existing.phone),
  city: trimText(payload.city || existing.city),
  avatarUrl: payload.avatarUrl || existing.avatarUrl || '',
  role: payload.role || existing.role || 'guide',
  roleLabel: payload.roleLabel || existing.roleLabel || '',
  displayRole: payload.displayRole || existing.displayRole || payload.roleLabel || existing.role || 'guide',
  status: payload.status || existing.status || REVIEW_STATUS.PENDING,
  reviewStatus: payload.reviewStatus || existing.reviewStatus || payload.status || existing.status || REVIEW_STATUS.PENDING,
  requestedRole: payload.requestedRole || existing.requestedRole || payload.role || existing.role || 'customer',
  reviewedBy: payload.reviewedBy || existing.reviewedBy || '',
  reviewedAt: payload.reviewedAt || existing.reviewedAt || '',
  reviewRemark: payload.reviewRemark || existing.reviewRemark || '',
  updatedAt: nowIso(),
  createdAt: existing.createdAt || payload.createdAt || nowIso(),
});

const canEditDirectoryUser = (target, profile) => Boolean(
  profile && target && (
    isOwnerOrAdmin(profile)
    || sameId(target._id || target.id, profile.id)
    || sameId(target.openId, profile.openId)
  )
);

const validateDirectoryUserPayload = (user) => {
  if (!trimText(user.displayName || user.name)) return '请填写姓名';
  const phone = trimText(user.phone);
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) return '请输入 11 位中国大陆手机号';
  return '';
};

const userActions = {
  async listPending(payload, profile) {
    assertApprovedProfile(profile, ['owner', 'admin']);
    const users = await getAllActive('users');
    return success(users.filter(user => normalizeReviewStatus(user.reviewStatus || user.status) === REVIEW_STATUS.PENDING));
  },

  async review({ id, reviewStatus, role, reviewRemark = '' }, profile) {
    assertApprovedProfile(profile, ['owner', 'admin']);
    const target = await getById('users', id);
    if (!target) return failure('未找到用户');
    if (target.role === 'owner') return failure('不能修改 owner 账号');
    if (profile.role === 'admin' && (role === 'owner' || target.role === 'admin')) {
      return failure('管理员不能指派 owner 或修改管理员账号');
    }
    const nextStatus = normalizeReviewStatus(reviewStatus);
    if (![REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED, REVIEW_STATUS.DISABLED, REVIEW_STATUS.PENDING].includes(nextStatus)) {
      return failure('审核状态无效');
    }
    const nextRole = nextStatus === REVIEW_STATUS.APPROVED ? (role || target.requestedRole || target.role || 'customer') : (target.role || role || 'customer');
    if (nextRole === 'owner') return failure('不能通过审核入口指派 owner');
    const updatedAt = nowIso();
    const updateData = {
      role: nextRole,
      reviewStatus: nextStatus,
      status: nextStatus,
      reviewedBy: profile.openId,
      reviewedByUserId: profile.id,
      reviewedAt: updatedAt,
      reviewRemark: trimText(reviewRemark),
      updatedAt,
    };
    await getCollection('users').doc(String(target._id || target.id)).update({ data: updateData });
    return success(toId({ ...target, ...updateData }));
  },

  async listVisible(payload, profile) {
    assertApprovedProfile(profile);
    if (isOwnerOrAdmin(profile)) {
      const users = await getAllActive('users');
      return success(users);
    }
    const result = await getCollection('users').where({ openId: profile.openId }).limit(1).get();
    return success((result.data || []).map(toId));
  },

  async getById({ id }, profile) {
    assertApprovedProfile(profile);
    const target = await getById('users', id);
    if (!canEditDirectoryUser(target, profile)) return failure('当前账号没有资料查看权限');
    return success(target);
  },

  async save(payload, profile) {
    assertApprovedProfile(profile);
    const target = payload.id ? await getById('users', payload.id) : null;
    if (payload.id && !canEditDirectoryUser(target, profile)) return failure('当前账号没有保存权限');
    if (!payload.id && !isOwnerOrAdmin(profile)) return failure('当前账号不能新增资料');

    const normalized = normalizeDirectoryUser(payload, target || {});
    const validationError = validateDirectoryUserPayload(normalized);
    if (validationError) return failure(validationError);
    if (profile.role === 'admin' && normalized.role === 'owner') {
      return failure('管理员不能指派 owner');
    }
    if (!isOwnerOrAdmin(profile)) {
      normalized.role = target.role || profile.role;
      normalized.status = target.status || profile.status || 'active';
    }

    if (target) {
      await getCollection('users').doc(String(target._id || target.id)).update({ data: toUpdateData(normalized) });
      return success(toId({ ...normalized, _id: target._id || target.id }));
    }

    const result = await getCollection('users').add({ data: normalized });
    return success(toId({ ...normalized, _id: result._id }));
  },
};

const normalizeProviderPayload = (payload, existing = {}) => ({
  ...existing,
  id: payload.id || existing.id || existing._id || '',
  title: trimText(payload.title || existing.title),
  contact: trimText(payload.contact || existing.contact),
  statusText: trimText(payload.statusText || existing.statusText || '可显示资料'),
  note: trimText(payload.note || existing.note),
  updatedAt: nowIso(),
  createdAt: existing.createdAt || payload.createdAt || nowIso(),
  deletedAt: existing.deletedAt || '',
});

const validateProviderPayload = (provider) => {
  if (!trimText(provider.title)) return '请填写供应商名称';
  if (!trimText(provider.contact)) return '请填写供应商联系人';
  return '';
};

const providerActions = {
  async listVisible(payload, profile) {
    assertApprovedProfile(profile, ['owner', 'admin', 'provider']);
    const providers = await getAllActive('providers');
    if (isOwnerOrAdmin(profile)) return success(providers);
    return success(providers.filter(provider => sameId(provider._id || provider.id, profile.providerId || profile.id)));
  },

  async getById({ id }, profile) {
    assertApprovedProfile(profile, ['owner', 'admin', 'provider']);
    const provider = await getById('providers', id);
    if (provider && !isOwnerOrAdmin(profile) && !sameId(provider._id || provider.id, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料查看权限');
    }
    return provider ? success(provider) : failure('未找到供应商资料');
  },

  async save(payload, profile) {
    assertApprovedProfile(profile, ['owner', 'admin', 'provider']);
    const scopedPayload = isOwnerOrAdmin(profile)
      ? payload
      : { ...payload, id: payload.id || profile.providerId || profile.id };
    const target = scopedPayload.id ? await getById('providers', scopedPayload.id) : null;
    if (target && !isOwnerOrAdmin(profile) && !sameId(target._id || target.id, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料维护权限');
    }
    const normalized = normalizeProviderPayload(scopedPayload, target || {});
    const validationError = validateProviderPayload(normalized);
    if (validationError) return failure(validationError);
    if (target) {
      await getCollection('providers').doc(String(target._id || target.id)).update({ data: toUpdateData(normalized) });
      return success(toId({ ...normalized, _id: target._id || target.id }));
    }
    const result = await getCollection('providers').add({ data: normalized });
    return success(toId({ ...normalized, _id: result._id }));
  },
};

const handlers = {
  users: userActions,
  providers: providerActions,
  products: productActions,
  groupOrders: groupOrderActions,
  customerOrders: customerOrderActions,
};

exports.main = async (event = {}) => {
  try {
    await ensureCollections();
    const profile = await getCurrentProfile();
    const { resource, action, data = {} } = event;
    const resourceHandler = handlers[resource];
    const actionHandler = resourceHandler && resourceHandler[action];
    if (!actionHandler) return failure('资料操作不存在');
    return actionHandler(data, profile);
  } catch (err) {
    return failure(toPublicError(err));
  }
};
