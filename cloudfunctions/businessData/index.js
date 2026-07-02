const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const COLLECTIONS = [
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

const STATUS_TEXT = {
  [MEMBER_ORDER_STATUS.UNPAID]: '未付款',
  [MEMBER_ORDER_STATUS.PAID]: '客户付款',
  [MEMBER_ORDER_STATUS.CONFIRMED]: '已确认',
  [MEMBER_ORDER_STATUS.CANCELLED]: '已取消',
};

const nowIso = () => new Date().toISOString();
const sameId = (a, b) => String(a) === String(b);
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
  };
};

const isOwnerOrAdmin = profile => (
  profile && (profile.role === 'owner' || profile.role === 'admin')
);

const assertProfile = (profile) => {
  if (!profile) throw new Error('请先完成微信登录');
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
  if (!profile) return Number(groupOrder.status) === GROUP_ORDER_STATUS.OPEN;
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
  providerId: payload.providerId || existing.providerId || '',
  sourceNote: String(payload.sourceNote || existing.sourceNote || '').trim(),
  status: Number(payload.status || existing.status || PRODUCT_STATUS.PUBLISHED),
  deletedAt: existing.deletedAt || '',
});

const productActions = {
  async listVisible({ keyword = '', status = 0 }, profile) {
    assertProfile(profile);
    const products = (await getAllActive('products')).filter(product => canViewProduct(product, profile));
    const statusValue = Number(status || 0);
    const statusFiltered = statusValue ? products.filter(product => Number(product.status) === statusValue) : products;
    return success(filterKeyword(statusFiltered, keyword, ['title', 'description', 'sourceNote']));
  },

  async create(payload, profile) {
    assertProfile(profile);
    if (!['guide', 'owner', 'admin', 'provider'].includes(profile.role)) return failure('当前角色不能新增商品');
    const createdAt = nowIso();
    const product = normalizeProductPayload({
      ...payload,
      createdAt,
      updatedAt: createdAt,
    }, profile);
    const result = await getCollection('products').add({ data: product });
    return success(toId({ ...product, _id: result._id }));
  },

  async updateStatus({ id, status }, profile) {
    assertProfile(profile);
    const product = await getById('products', id);
    if (!canManageProduct(product, profile)) return failure('当前角色不能修改此商品');
    const updatedAt = nowIso();
    await getCollection('products').doc(String(product._id || product.id)).update({
      data: { status: Number(status), updatedAt },
    });
    return success({ ...product, status: Number(status), updatedAt });
  },

  async softDelete({ id }, profile) {
    assertProfile(profile);
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
    assertProfile(profile);
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
    const groupOrder = await getById('groupOrders', id);
    if (!await canViewGroupOrder(groupOrder, profile)) return failure('当前角色不能查看此团单');
    return success(groupOrder);
  },

  async create(payload, profile) {
    assertProfile(profile);
    if (!['guide', 'owner', 'admin'].includes(profile.role)) return failure('当前角色不能新建团单');
    const createdAt = nowIso();
    const groupOrder = normalizeGroupOrderPayload({
      ...payload,
      createdAt,
      updatedAt: createdAt,
    }, profile);
    const result = await getCollection('groupOrders').add({ data: groupOrder });
    const sharePath = `/pages/customerOrders/edit/index?groupOrderId=${result._id}`;
    await getCollection('groupOrders').doc(result._id).update({ data: { sharePath } });
    const created = toId({ ...groupOrder, _id: result._id, sharePath });
    await syncGroupOrderProducts(created, created.productList, profile);
    return success(created);
  },

  async update({ id, data }, profile) {
    assertProfile(profile);
    const target = await getById('groupOrders', id);
    if (!canManageGroupOrder(target, profile)) return failure('当前角色不能编辑此团单');
    const updated = normalizeGroupOrderPayload({
      ...data,
      updatedAt: nowIso(),
    }, profile, target);
    await getCollection('groupOrders').doc(String(target._id || target.id)).update({ data: toUpdateData(updated) });
    return success(toId({ ...updated, _id: target._id || target.id }));
  },

  async addProducts({ groupOrderId, products = [] }, profile) {
    assertProfile(profile);
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
    assertProfile(profile);
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

const customerOrderActions = {
  async listVisible(payload, profile) {
    assertProfile(profile);
    const orders = (await getAllActive('customerOrders')).map(normalizeOrder);
    const visibilityResults = await Promise.all(orders.map(async order => ({
      order,
      visible: await canViewOrder(order, profile),
    })));
    const visible = visibilityResults.filter(item => item.visible).map(item => item.order);
    return success(visible);
  },

  async listByGroupOrder({ groupOrderId }, profile) {
    assertProfile(profile);
    const groupOrder = await getById('groupOrders', groupOrderId);
    if (!await canViewGroupOrder(groupOrder, profile)) return failure('当前角色不能查看此团单订单');
    const orders = (await getAllActive('customerOrders'))
      .filter(order => sameId(order.groupOrderId, groupOrderId))
      .filter(order => profile.role !== 'customer' || sameId(order.customerOpenId, profile.openId))
      .map(normalizeOrder);
    return success(orders);
  },

  async getById({ id }, profile) {
    assertProfile(profile);
    const rawOrder = await getById('customerOrders', id);
    if (!rawOrder) return failure('未找到订单资料');
    const order = normalizeOrder(rawOrder);
    if (!await canViewOrder(order, profile)) return failure('未找到订单资料');
    return success(order);
  },

  async getGroupOrderEntry({ groupOrderId }, profile) {
    const groupOrder = await getById('groupOrders', groupOrderId);
    if (!await canViewGroupOrder(groupOrder, profile)) return failure('当前角色不能进入此团单');
    return success(groupOrder);
  },

  async create(payload, profile) {
    assertProfile(profile);
    if (profile.role !== 'customer' && !isOwnerOrAdmin(profile)) return failure('当前角色不能提交客户订单');
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
  }, profile) {
    assertProfile(profile);
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
    if (nextStatusValue === MEMBER_ORDER_STATUS.CONFIRMED && Number(target.status) !== MEMBER_ORDER_STATUS.PAID) {
      return failure('只有客户已付款订单才能确认到账');
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
      paymentMethod: paymentMethod || target.paymentMethod || '',
      paymentRemark: paymentRemark || target.paymentRemark || '',
      paymentProofUrls: paymentProofUrls || target.paymentProofUrls || [],
      confirmedAmount: confirmedAmount || target.confirmedAmount || '',
      confirmRemark: confirmRemark || target.confirmRemark || '',
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
          method: 'manual',
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

const handlers = {
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
    if (!actionHandler) return failure('未知云端资料操作');
    return actionHandler(data, profile);
  } catch (err) {
    return failure(err && (err.message || err.errMsg) ? (err.message || err.errMsg) : '云端资料操作失败');
  }
};
