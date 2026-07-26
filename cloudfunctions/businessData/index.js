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

const INTERNAL_PRODUCT_COPY_RE = /QA|mock|Seed|MVP|local|test|automation|自动化|测试|本地|后续|未完成|暂未|未开放|未启用|未串接/i;
const PREVIEW_STATUSES = new Set([REVIEW_STATUS.PENDING, REVIEW_STATUS.REJECTED, REVIEW_STATUS.DISABLED]);
const PREVIEWABLE_ROLES = Object.freeze(['guide', 'customer', 'provider', 'admin', 'owner']);
const ALL_PREVIEW_ROLES = new Set([...PREVIEWABLE_ROLES, ...PREVIEW_STATUSES, 'visitor']);
const APP_ENV = String((process.env.APP_ENV || process.env.ENV_NAME || 'PROD').toUpperCase());
const ALLOW_ROLE_PREVIEW = APP_ENV === 'DEV' && process.env.ALLOW_ROLE_PREVIEW === 'true';
const PREVIEW_OPEN_ID_PREFIX = 'preview-openid:';
const PREVIEW_ID_PREFIX = 'preview:';

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
const ALL_ROLES = ['owner', 'admin', 'guide', 'customer', 'provider'];
const normalizeShareToken = value => String(value || '').trim();
const buildShareToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const parseExpiryTime = (value) => {
  if (!value) return 0;
  const text = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T23:59:59` : text;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const buildShareExpiresAt = (endAt) => {
  const endTime = parseExpiryTime(endAt);
  const safeTime = endTime || Date.now();
  return new Date(safeTime).toISOString();
};
const buildCustomerEntryPath = (groupOrderId, shareToken = '') => {
  const basePath = `/pages/customerOrders/edit/index?groupOrderId=${encodeURIComponent(String(groupOrderId || ''))}`;
  const normalizedToken = normalizeShareToken(shareToken);
  return normalizedToken ? `${basePath}&shareToken=${encodeURIComponent(normalizedToken)}` : basePath;
};
const normalizeRoles = (roles, fallbackRole = '') => {
  const rawRoles = Array.isArray(roles) ? [...roles, fallbackRole] : [fallbackRole];
  return [...new Set(rawRoles.filter(role => ALL_ROLES.includes(role)))];
};
const hasRole = (profile, role) => normalizeRoles(profile && profile.roles, profile && profile.role).includes(role);
const hasAnyRole = (profile, roles = []) => normalizeRoles(profile && profile.roles, profile && profile.role).some(role => roles.includes(role));
const isRoleExpired = profile => Boolean(profile && parseExpiryTime(profile.roleExpiresAt || profile.rolesExpireAt || profile.expiresAt) < Date.now() && parseExpiryTime(profile.roleExpiresAt || profile.rolesExpireAt || profile.expiresAt));
const roleLabel = (role) => {
  const labels = {
    owner: '产品拥有者',
    admin: '运营管理员',
    guide: '团主',
    customer: '客户',
    provider: '供应商',
  };
  return labels[role] || role;
};
const roleLabelText = roles => normalizeRoles(roles).map(roleLabel).join('、');
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
  '当前账号使用期限已过',
  '当前账号没有此操作权限',
]);
const toPublicError = (err) => {
  const message = err && err.message ? err.message : '';
  return PUBLIC_THROW_MESSAGES.has(message) ? message : '资料服务暂时不可用，请稍后再试';
};

const toStringSafe = value => String(value || '');

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
    roles: normalizeRoles(profile.roles, profile.role || 'guide'),
    status: normalizeReviewStatus(profile.reviewStatus || profile.status),
    reviewStatus: normalizeReviewStatus(profile.reviewStatus || profile.status),
    roleExpiresAt: profile.roleExpiresAt || profile.rolesExpireAt || '',
    rolesExpireAt: profile.rolesExpireAt || profile.roleExpiresAt || '',
  };
};

const normalizePreviewRole = (value) => {
  const role = String(value || '').trim();
  if (role === 'visitor') return role;
  if (ALL_PREVIEW_ROLES.has(role)) return role;
  return '';
};

const isPreviewAllowedForProfile = profile => Boolean(
  profile
  && normalizeRoles(profile.roles, profile.role).includes('owner')
  && normalizeReviewStatus(profile.reviewStatus || profile.status) === REVIEW_STATUS.APPROVED
);

const buildFormalProfile = (profile) => {
  if (!profile) return profile;
  const realOpenId = toStringSafe(profile.openId);
  const realUserId = toStringSafe(profile.id);
  return {
    ...profile,
    realOpenId,
    realUserId,
    realRole: toStringSafe(profile.role),
    effectiveRole: toStringSafe(profile.role),
    effectivePrincipalType: 'formal',
    effectivePrincipalId: realUserId,
  };
};

const buildPreviewProfile = (profile, previewRole, previewData) => {
  const effectiveRole = previewData.role;
  const realOpenId = toStringSafe(profile.openId);
  const realUserId = toStringSafe(profile.id);
  const syntheticSuffix = `${realOpenId && realUserId ? ':' : ''}${previewRole}`;
  return {
    ...profile,
    ...previewData,
    realOpenId,
    realUserId,
    realRole: toStringSafe(profile.role),
    effectiveRole,
    effectivePrincipalType: 'preview',
    effectivePrincipalId: `${PREVIEW_ID_PREFIX}${realUserId}${syntheticSuffix}`,
    openId: `${PREVIEW_OPEN_ID_PREFIX}${realOpenId}${syntheticSuffix}`,
    id: `${PREVIEW_ID_PREFIX}${realUserId}${syntheticSuffix}`,
  };
};

const applyPreviewProfile = (profile, previewRole) => {
  if (!profile || !previewRole) return buildFormalProfile(profile);
  if (previewRole === 'visitor') {
    return buildPreviewProfile(profile, '', {
      role: '',
      roles: [],
      roleLabel: '游客',
      status: '',
      reviewStatus: '',
      isRolePreview: true,
      isVisitorPreview: true,
      realRoleLabel: roleLabelText(profile.roles || []),
    });
  }
  if (PREVIEW_STATUSES.has(previewRole)) {
    return buildPreviewProfile(profile, 'customer', {
      role: 'customer',
      roles: ['customer'],
      roleLabel: roleLabel('customer'),
      status: previewRole,
      reviewStatus: previewRole,
      isRolePreview: true,
      isVisitorPreview: false,
      realRoleLabel: roleLabelText(profile.roles || []),
    });
  }
  if (!PREVIEWABLE_ROLES.includes(previewRole)) return buildFormalProfile(profile);
  return buildPreviewProfile(profile, previewRole, {
    role: previewRole,
    roles: [previewRole],
    roleLabel: roleLabel(previewRole),
    status: REVIEW_STATUS.APPROVED,
    reviewStatus: REVIEW_STATUS.APPROVED,
    isRolePreview: true,
    isVisitorPreview: false,
    realRoleLabel: roleLabelText(profile.roles || []),
  });
};

const getCallerProfile = async (eventContext = {}) => {
  const baseProfile = await getCurrentProfile();
  if (!baseProfile) return null;
  const formalProfile = buildFormalProfile(baseProfile);
  if (
    (eventContext.simulationRole || eventContext.previewRole)
    && !eventContext.isRolePreview
  ) {
    throw new Error('当前账号不支持角色预览');
  }
  if (!eventContext || !eventContext.isRolePreview) return formalProfile;

  const previewRole = normalizePreviewRole(eventContext.simulationRole || eventContext.previewRole);
  if (!previewRole) throw new Error('预览身份参数无效');
  if (!ALLOW_ROLE_PREVIEW) throw new Error('当前环境不允许角色预览');
  if (!isPreviewAllowedForProfile(baseProfile)) throw new Error('当前账号不支持角色预览');

  return applyPreviewProfile(baseProfile, previewRole);
};

const isOwnerOrAdmin = profile => (
  profile && (hasRole(profile, 'owner') || hasRole(profile, 'admin'))
);

const assertProfile = (profile) => {
  if (!profile) throw new Error('请先完成微信登录');
};

const assertApprovedProfile = (profile, allowedRoles = []) => {
  assertProfile(profile);
  if (normalizeReviewStatus(profile.reviewStatus || profile.status) !== REVIEW_STATUS.APPROVED) {
    throw new Error('当前账号尚未通过管理员审核');
  }
  if (isRoleExpired(profile)) {
    throw new Error('当前账号使用期限已过');
  }
  if (allowedRoles.length && !hasAnyRole(profile, allowedRoles)) {
    throw new Error('当前账号没有此操作权限');
  }
};

const canManageProduct = (product, profile) => {
  if (!profile || !product) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (hasRole(profile, 'guide')) return sameId(product.ownerOpenId, profile.openId);
  if (hasRole(profile, 'provider')) return sameId(product.providerId, profile.providerId || profile.id);
  return false;
};

const canViewProduct = (product, profile) => {
  if (!profile || !product || product.deletedAt) return false;
  if (isOwnerOrAdmin(profile)) return true;
  const isPublishedPublic = Number(product.status) === PRODUCT_STATUS.PUBLISHED
    && product.visibility !== 'private';
  if (hasRole(profile, 'guide')) {
    return sameId(product.ownerOpenId, profile.openId) || isPublishedPublic;
  }
  if (hasRole(profile, 'provider')) return sameId(product.providerId, profile.providerId || profile.id);
  if (hasRole(profile, 'customer')) return isPublishedPublic;
  return false;
};

const canManageGroupOrder = (groupOrder, profile) => {
  if (!profile || !groupOrder) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (!hasRole(profile, 'guide')) return false;
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
  if (hasRole(profile, 'customer')) {
    if (Number(groupOrder.status) === GROUP_ORDER_STATUS.OPEN) return true;
    const orderResult = await getCollection('customerOrders')
      .where({ groupOrderId: groupOrder.id || groupOrder._id, customerOpenId: profile.openId })
      .limit(1)
      .get();
    return Boolean(orderResult.data && orderResult.data.length);
  }
  return false;
};
const getShareAccessError = (groupOrder, profile, shareToken = '') => {
  if (!groupOrder || groupOrder.deletedAt) return '未找到团单';
  if (isOwnerOrAdmin(profile)) return '';
  if (canManageGroupOrder(groupOrder, profile)) return '';
  if (!hasRole(profile, 'customer')) return '';
  const normalizedToken = normalizeShareToken(shareToken);
  if (!normalizedToken) return '请从分享链接进入团单';
  if (normalizeShareToken(groupOrder.shareToken) !== normalizedToken) return '分享链接无效';
  const shareExpireTime = parseExpiryTime(groupOrder.shareExpiresAt || groupOrder.endAt);
  if (!shareExpireTime || shareExpireTime <= Date.now()) return '分享入口已过期';
  if (parseExpiryTime(groupOrder.endAt) <= Date.now()) return '当前团单已停止收单';
  return '';
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
const isDurableProfileAvatarUrl = url => (
  isDurableAssetUrl(url) || /^\/static\//.test(String(url))
);

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
  providerId: payload.providerId || existing.providerId || (hasRole(profile, 'provider') ? (profile.providerId || profile.id) : ''),
  sourceNote: String(payload.sourceNote || existing.sourceNote || '').trim(),
  status: Number(payload.status || existing.status || PRODUCT_STATUS.PUBLISHED),
  deletedAt: existing.deletedAt || '',
});

const validateProductPayload = (product) => {
  if (!trimText(product.title)) return '请输入商品名称';
  if (!trimText(product.description)) return '请输入商品描述';
  if (!trimText(product.sourceNote)) return '请输入供应来源或备注';
  if ([product.title, product.description, product.sourceNote].some(value => INTERNAL_PRODUCT_COPY_RE.test(String(value || '')))) {
    return '商品资料包含不适合公开展示的文字，请调整后保存';
  }
  if (!Array.isArray(product.pictureUrls) || product.pictureUrls.length === 0) return '请至少上传一张商品图片';
  if (!Array.isArray(product.priceSetting) || product.priceSetting.length === 0) return '请至少设置一组价格';
  const invalidRule = product.priceSetting.find(rule => Number(rule.minQuantity) <= 0 || Number(rule.unitPrice) <= 0);
  if (invalidRule) return '价格规则需包含有效起订量和单价';
  return '';
};

const productActions = {
  async listPublic({ keyword = '' }) {
    const products = (await getAllActive('products')).filter(product => (
      Number(product.status) === PRODUCT_STATUS.PUBLISHED
      && product.visibility !== 'private'
      && !hasInternalProductCopy(product)
    ));
    return success(filterKeyword(products, keyword, ['title', 'description', 'sourceNote']));
  },

  async listVisible({ keyword = '', status = 0 }, profile) {
    assertApprovedProfile(profile, ['guide', 'customer', 'owner', 'admin', 'provider']);
    const products = (await getAllActive('products')).filter(product => canViewProduct(product, profile));
    const statusValue = Number(status || 0);
    const statusFiltered = statusValue ? products.filter(product => Number(product.status) === statusValue) : products;
    return success(filterKeyword(statusFiltered, keyword, ['title', 'description', 'sourceNote']));
  },

  async create(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    if (!hasAnyRole(profile, ['guide', 'owner', 'admin', 'provider'])) return failure('当前角色不能新增商品');
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
  if (!trimText(groupOrder.pickupNote)) return '请输入取货/交付/集合说明';
  if (!trimText(groupOrder.paymentNote)) return '请输入付款方式或付款备注';
  if (!trimText(groupOrder.contactName)) return '请输入团主联系人';
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
  if (!hasRole(profile, 'guide')) return false;
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

const normalizeDirectoryUser = (payload, existing = {}) => ({
  ...existing,
  displayName: trimText(payload.displayName || payload.name || existing.displayName || existing.name),
  name: trimText(payload.name || payload.displayName || existing.name || existing.displayName),
  phone: trimText(payload.phone || existing.phone),
  city: trimText(payload.city || existing.city),
  gender: Number(payload.gender !== undefined ? payload.gender : (existing.gender || 0)),
  birth: trimText(payload.birth || existing.birth),
  introduction: trimText(payload.introduction || existing.introduction),
  avatarUrl: payload.avatarUrl || existing.avatarUrl || '',
  role: payload.role || existing.role || 'guide',
  roles: normalizeRoles(payload.roles || existing.roles, payload.role || existing.role || 'guide'),
  roleLabel: payload.roleLabel || existing.roleLabel || '',
  displayRole: payload.displayRole || existing.displayRole || payload.roleLabel || existing.role || 'guide',
  roleExpiresAt: payload.roleExpiresAt || existing.roleExpiresAt || '',
  rolesExpireAt: payload.rolesExpireAt || payload.roleExpiresAt || existing.rolesExpireAt || existing.roleExpiresAt || '',
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
  const birth = trimText(user.birth);
  if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return '生日格式无效';
  if (birth && birth > new Date().toISOString().slice(0, 10)) return '生日不能晚于今天';
  return '';
};

const validateRequestedRole = role => ['guide', 'customer', 'provider'].includes(role);

const userActions = {
  async listPending(payload, profile) {
    assertApprovedProfile(profile, ['owner', 'admin']);
    const users = await getAllActive('users');
    return success(users.filter(user => !normalizeRoles(user.roles, user.role).includes('owner')));
  },

  async review({ id, reviewStatus, role, roles, roleExpiresAt = '', reviewRemark = '' }, profile) {
    assertApprovedProfile(profile, ['owner', 'admin']);
    const target = await getById('users', id);
    if (!target) return failure('未找到用户');
    const rawRequestedRoles = normalizeRoles(roles, role || target.requestedRole || target.role || 'customer');
    const requestedRoles = rawRequestedRoles.filter(item => item !== 'owner');
    if (target.role === 'owner' || normalizeRoles(target.roles, target.role).includes('owner')) return failure('不能修改 owner 账号');
    if (hasRole(profile, 'admin') && (rawRequestedRoles.includes('owner') || normalizeRoles(target.roles, target.role).includes('admin'))) {
      return failure('管理员不能指派 owner 或修改管理员账号');
    }
    const nextStatus = normalizeReviewStatus(reviewStatus);
    if (![REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED, REVIEW_STATUS.DISABLED, REVIEW_STATUS.PENDING].includes(nextStatus)) {
      return failure('审核状态无效');
    }
    if (nextStatus === REVIEW_STATUS.APPROVED && !requestedRoles.length) return failure('请至少选择一个可用角色');
    const nextRoles = nextStatus === REVIEW_STATUS.APPROVED
      ? requestedRoles
      : normalizeRoles(target.roles, target.role || role || 'customer').filter(item => item !== 'owner');
    const nextRole = nextStatus === REVIEW_STATUS.APPROVED ? nextRoles[0] : (target.role || role || 'customer');
    if (nextRole === 'owner') return failure('不能通过审核入口指派 owner');
    const updatedAt = nowIso();
    const labels = roleLabelText(nextRoles);
    const updateData = {
      role: nextRole,
      roles: nextRoles,
      roleLabel: labels,
      displayRole: labels,
      roleExpiresAt: trimText(roleExpiresAt),
      rolesExpireAt: trimText(roleExpiresAt),
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

  async applyForRole(payload, profile) {
    assertProfile(profile);
    const applicationPayload = payload || {};
    const requestedRole = trimText(applicationPayload.requestedRole || 'guide');
    if (!validateRequestedRole(requestedRole)) return failure('申请身份无效');
    const result = await getCollection('users').where({ openId: profile.openId }).limit(1).get();
    const target = result.data && result.data[0];
    if (!target) return failure('未找到当前账号资料');
    const currentStatus = normalizeReviewStatus(target.reviewStatus || target.status);
    if (currentStatus === REVIEW_STATUS.PENDING && target.requestedRole === requestedRole) {
      return failure('申请已提交，请等待管理员确认');
    }
    if (currentStatus === REVIEW_STATUS.DISABLED) return failure('当前账号已停用，请联系管理员');
    if (target.role === requestedRole && currentStatus === REVIEW_STATUS.APPROVED) {
      return failure('当前账号已是该身份');
    }

    const next = normalizeDirectoryUser({
      ...target,
      ...applicationPayload,
      role: target.role || profile.role || 'customer',
      roles: normalizeRoles(target.roles, target.role || profile.role || 'customer'),
      requestedRole,
      status: REVIEW_STATUS.PENDING,
      reviewStatus: REVIEW_STATUS.PENDING,
      reviewRemark: '',
      reviewedBy: '',
      reviewedAt: '',
    }, target);
    const validationError = validateDirectoryUserPayload(next);
    if (validationError) return failure(validationError);
    if (!isDurableProfileAvatarUrl(next.avatarUrl)) return failure('请重新上传头像后保存');

    await getCollection('users').doc(String(target._id || target.id)).update({ data: toUpdateData(next) });
    return success(toId({ ...next, _id: target._id || target.id }));
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
    if (!isDurableProfileAvatarUrl(normalized.avatarUrl)) return failure('请重新上传头像后保存');
    if (hasRole(profile, 'admin') && normalized.role === 'owner') {
      return failure('管理员不能指派 owner');
    }
    if (!isOwnerOrAdmin(profile)) {
      normalized.role = target.role || profile.role;
      normalized.roles = target.roles || profile.roles || [normalized.role];
      normalized.roleLabel = target.roleLabel || normalized.roleLabel || '';
      normalized.displayRole = target.displayRole || target.roleLabel || normalized.role;
      normalized.status = target.status || profile.status || REVIEW_STATUS.APPROVED;
      normalized.reviewStatus = target.reviewStatus || target.status || profile.reviewStatus || profile.status || REVIEW_STATUS.APPROVED;
      normalized.requestedRole = target.requestedRole || profile.requestedRole || normalized.role;
      normalized.reviewedBy = target.reviewedBy || '';
      normalized.reviewedAt = target.reviewedAt || '';
      normalized.reviewRemark = target.reviewRemark || '';
      normalized.openId = target.openId || profile.openId;
      normalized.unionId = target.unionId || profile.unionId || '';
      normalized.providerId = target.providerId || profile.providerId || '';
    }

    if (target) {
      await getCollection('users').doc(String(target._id || target.id)).update({ data: toUpdateData(normalized) });
      return success(toId({ ...normalized, _id: target._id || target.id }));
    }

    const result = await getCollection('users').add({ data: normalized });
    return success(toId({ ...normalized, _id: result._id }));
  },
};

// D-6 供应商停用/软删除两档模型：status（active/disabled，可回切）+ deletedAt（软删，getAllActive 已滤）。
const normalizeProviderStatus = status => (status === 'disabled' ? 'disabled' : 'active');

const normalizeProviderPayload = (payload, existing = {}) => ({
  ...existing,
  id: payload.id || existing.id || existing._id || '',
  title: trimText(payload.title || existing.title),
  contact: trimText(payload.contact || existing.contact),
  statusText: trimText(payload.statusText || existing.statusText || '可显示资料'),
  note: trimText(payload.note || existing.note),
  status: normalizeProviderStatus(payload.status || existing.status),
  updatedAt: nowIso(),
  createdAt: existing.createdAt || payload.createdAt || nowIso(),
  deletedAt: existing.deletedAt || '',
});

const validateProviderPayload = (provider) => {
  if (!trimText(provider.title)) return '请填写供应商名称';
  if (!trimText(provider.contact)) return '请填写供应商联系人';
  return '';
};

const sameProviderId = (provider, providerId) => Boolean(
  provider
  && (
    sameId(provider.id, providerId)
    || sameId(provider._id, providerId)
  )
);

const providerActions = {
  async listVisible(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const providers = await getAllActive('providers');
    if (isOwnerOrAdmin(profile)) return success(providers);
    const providerId = profile.providerId || profile.id;
    return success(providers.filter(provider => sameProviderId(provider, providerId)));
  },

  async getById({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const provider = await getById('providers', id);
    if (provider && !isOwnerOrAdmin(profile) && !sameProviderId(provider, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料查看权限');
    }
    return provider ? success(provider) : failure('未找到供应商资料');
  },

  async save(payload, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const scopedPayload = isOwnerOrAdmin(profile)
      ? payload
      : { ...payload, id: payload.id || profile.providerId || profile.id };
    const target = scopedPayload.id ? await getById('providers', scopedPayload.id) : null;
    if (target && !isOwnerOrAdmin(profile) && !sameProviderId(target, profile.providerId || profile.id)) {
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
    const created = toId({ ...normalized, _id: result._id });
    if (hasRole(profile, 'provider') && !profile.providerId) {
      await getCollection('users').doc(String(profile._id || profile.id)).update({
        data: { providerId: created.id, updatedAt: nowIso() },
      });
    }
    return success(created);
  },

  // D-6：停用/启用（可回切）。停用后该供应商商品不进新团单选品，历史订单不受影响。
  async setStatus({ id, status }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const target = await getById('providers', id);
    if (!target) return failure('未找到供应商资料');
    if (!isOwnerOrAdmin(profile) && !sameProviderId(target, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料维护权限');
    }
    if (target.deletedAt) return failure('供应商已删除，无法变更状态');
    const nextStatus = normalizeProviderStatus(status);
    await getCollection('providers').doc(String(target._id || target.id)).update({
      data: { status: nextStatus, updatedAt: nowIso() },
    });
    return success(toId({ ...target, status: nextStatus }));
  },

  // D-6：软删除（保留快照供历史订单追溯，仅移出列表与选品）。
  async remove({ id }, profile) {
    assertApprovedProfile(profile, ['guide', 'owner', 'admin', 'provider']);
    const target = await getById('providers', id);
    if (!target) return failure('未找到供应商资料');
    if (!isOwnerOrAdmin(profile) && !sameProviderId(target, profile.providerId || profile.id)) {
      return failure('当前账号没有供应商资料维护权限');
    }
    if (target.deletedAt) return success(target);
    const deletedAt = nowIso();
    await getCollection('providers').doc(String(target._id || target.id)).update({
      data: { deletedAt, updatedAt: deletedAt },
    });
    return success(toId({ ...target, deletedAt }));
  },

  // D-6 内部用：跨服务（productService.listSelectable）判定供应商有效性，返回 id → 是否有效。
  // 只暴露 id/有效性，不含敏感资料，故仅要求登录审核通过、不限角色（选品者未必是供应商角色）。
  async statusMap(payload, profile) {
    assertApprovedProfile(profile);
    const result = await getCollection('providers').limit(100).get();
    const map = {};
    (result.data || []).forEach((raw) => {
      const provider = toId(raw);
      map[String(provider.id)] = !provider.deletedAt && provider.status !== 'disabled';
    });
    return success(map);
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
    const context = event.context || {};
    const profile = await getCallerProfile(context);
    const { resource, action, data = {} } = event;
    const resourceHandler = handlers[resource];
    const actionHandler = resourceHandler && resourceHandler[action];
    if (!actionHandler) return failure('资料操作不存在');
    return await actionHandler(data, profile);
  } catch (err) {
    return failure(toPublicError(err));
  }
};
