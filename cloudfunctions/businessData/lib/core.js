// 共享层：云初始化/常量/通用helper/db访问/权限/预览。resources 与 index 都从这里 require。
// 权限镜像见地端 services/auth/roleScope.js —— 改权限必须两边同步(见 DEVELOPMENT_GUIDE 地端云端双通铁律)。
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
  'feedbacks',
  'operationLogs',
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
// 可过期的「提升角色」：到期后收回 guide/admin；customer 基线、owner 产品拥有者均不过期。
// 与地端 roleScope.getEffectiveRoles 对齐（地端云端双通）：权限判定走 effectiveRoles，hasRole 保留原义。
const EXPIRABLE_ROLES = ['guide', 'admin'];
const getEffectiveRoles = (profile) => {
  const roles = normalizeRoles(profile && profile.roles, profile && profile.role);
  if (!isRoleExpired(profile)) return roles;
  return roles.filter(role => !EXPIRABLE_ROLES.includes(role));
};
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
  // 角色预览被云端拒绝时把真实原因透出（否则显示笼统「资料服务暂时不可用」害人误判）
  '当前环境不允许角色预览',
  '当前账号不支持角色预览',
  '预览身份参数无效',
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
  profile && (getEffectiveRoles(profile).includes('owner') || getEffectiveRoles(profile).includes('admin'))
);

const assertProfile = (profile) => {
  if (!profile) throw new Error('请先完成微信登录');
};

const assertApprovedProfile = (profile, allowedRoles = []) => {
  assertProfile(profile);
  if (normalizeReviewStatus(profile.reviewStatus || profile.status) !== REVIEW_STATUS.APPROVED) {
    throw new Error('当前账号尚未通过管理员审核');
  }
  const effectiveRoles = getEffectiveRoles(profile);
  // 到期只收回 guide/admin；仍有有效角色(如 customer 基线)即可用，无任何有效角色才算过期。
  if (!effectiveRoles.length) {
    throw new Error('当前账号使用期限已过');
  }
  if (allowedRoles.length && !allowedRoles.some(role => effectiveRoles.includes(role))) {
    throw new Error('当前账号没有此操作权限');
  }
};

const canManageProduct = (product, profile) => {
  if (!profile || !product) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (getEffectiveRoles(profile).includes('guide')) return sameId(product.ownerOpenId, profile.openId);
  if (hasRole(profile, 'provider')) return sameId(product.providerId, profile.providerId || profile.id);
  return false;
};

const canViewProduct = (product, profile) => {
  if (!profile || !product || product.deletedAt) return false;
  if (isOwnerOrAdmin(profile)) return true;
  const isPublishedPublic = Number(product.status) === PRODUCT_STATUS.PUBLISHED
    && product.visibility !== 'private';
  if (getEffectiveRoles(profile).includes('guide')) {
    return sameId(product.ownerOpenId, profile.openId) || isPublishedPublic;
  }
  if (hasRole(profile, 'provider')) return sameId(product.providerId, profile.providerId || profile.id);
  if (hasRole(profile, 'customer')) return isPublishedPublic;
  return false;
};

const canManageGroupOrder = (groupOrder, profile) => {
  if (!profile || !groupOrder) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (!getEffectiveRoles(profile).includes('guide')) return false;
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

// 最优组合计价（无限背包 DP）：价格档可任意次数混搭凑目标数量，取总价最低的组合。
// 跟客户端 services/customerOrder/customerOrderService.js 的 getOptimalCombo 同一套算法，
// 这里是服务端权威计算——下单金额绝对不能只信任客户端传来的数字。
const getOptimalComboPrice = (priceSetting, quantity) => {
  const count = Number(quantity || 0);
  const tiers = (priceSetting || [])
    .map(rule => ({
      minQuantity: Number(rule.minQuantity || 0),
      totalPrice: rule.totalPrice != null ? Number(rule.totalPrice) : Number(rule.minQuantity || 0) * Number(rule.unitPrice || 0),
    }))
    .filter(rule => rule.minQuantity > 0 && rule.totalPrice > 0);
  if (count <= 0 || !tiers.length) return null;
  const dp = new Array(count + 1).fill(Infinity);
  dp[0] = 0;
  for (let q = 1; q <= count; q += 1) {
    dp[q] = tiers.reduce((best, tier) => {
      if (tier.minQuantity > q) return best;
      const candidate = dp[q - tier.minQuantity] + tier.totalPrice;
      return candidate < best ? candidate : best;
    }, Infinity);
  }
  return Number.isFinite(dp[count]) ? Math.round(dp[count] * 100) / 100 : null;
};

// 操作记录：真正落库的事件表（不是从当前资料现算），删除后记录仍在。
// fieldMap: { 字段名: '显示名' | { label, format(value) } }，只收录真的变了的字段。
const buildChanges = (before = {}, after = {}, fieldMap = {}) => Object.entries(fieldMap)
  .map(([field, cfg]) => {
    const label = typeof cfg === 'string' ? cfg : cfg.label;
    const format = (typeof cfg === 'object' && cfg.format)
      ? cfg.format
      : value => (value === undefined || value === null || value === '' ? '（空）' : String(value));
    const beforeText = format(before ? before[field] : undefined);
    const afterText = format(after ? after[field] : undefined);
    if (beforeText === afterText) return null;
    return { field, label, before: beforeText, after: afterText };
  })
  .filter(Boolean);

// A7 要求「脱敏 OpenID」，不得写入完整明文——跟 maskOpenId（原客户端实现）同一口径。
const maskOpenId = (openId) => {
  const text = String(openId || '');
  if (text.length <= 8) return text ? '已验证账号' : '';
  return `${text.slice(0, 4)}****${text.slice(-4)}`;
};

// 记录失败不阻断主流程：业务动作已经成功，不该因为写日志失败让用户看到"保存失败"。
// visibleUserIds：非 owner/admin 时谁能看到这条记录（本团主、被授权协管团主…），
// 查询时不用回头查（可能已被删除的）原资料判权限，直接读这个快照。
const logOperation = async ({
  profile, resourceType, resourceId, resourceTitle, action, actionText, changes = [],
  visibleUserIds = [],
}) => {
  try {
    await getCollection('operationLogs').add({
      data: {
        occurredAt: nowIso(),
        actorUserId: profile.id,
        actorOpenIdMasked: maskOpenId(profile.openId),
        actorName: profile.displayName || '当前账号',
        // A2：审计要记「当时的 effectiveRole」而非只记 primary role（DEV 角色预览下两者可能不同）。
        actorRole: roleLabel(profile.effectiveRole || profile.role) || profile.effectiveRole || profile.role || '',
        resourceType,
        resourceId: String(resourceId || ''),
        resourceTitle: resourceTitle || '',
        action,
        actionText,
        changes,
        visibleUserIds: [...new Set([profile.id, ...(visibleUserIds || [])].filter(Boolean).map(String))],
      },
    });
  } catch (err) {
    // 静默失败，不抛出。
  }
};

const filterKeyword = (list, keyword, fields) => {
  const query = String(keyword || '').trim().toLowerCase();
  if (!query) return list;
  return list.filter(item => fields.some(field => String(item[field] || '').toLowerCase().includes(query)));
};

// 本地开发没有真的云存储，local-server 上传是直接沿用临时路径（见
// repositories/cloudBusinessRepository.js 的 uploadOneFile），那种路径
// 天生不是 cloud://|https://，正式环境才需要严格挡非持久化链接。
const isLocalDevEnv = () => cloud.DYNAMIC_CURRENT_ENV === 'local-dev';
const isDurableAssetUrl = url => (
  !url || /^cloud:\/\//.test(String(url)) || /^https:\/\//.test(String(url)) || isLocalDevEnv()
);

const hasOnlyDurableAssetUrls = urls => (urls || []).every(isDurableAssetUrl);
const isDurableProfileAvatarUrl = url => (
  isDurableAssetUrl(url) || /^\/static\//.test(String(url))
);


module.exports = {
  cloud,
  db,
  COLLECTIONS,
  PRODUCT_STATUS,
  GROUP_ORDER_STATUS,
  MEMBER_ORDER_STATUS,
  REVIEW_STATUS,
  INTERNAL_PRODUCT_COPY_RE,
  PREVIEW_STATUSES,
  PREVIEWABLE_ROLES,
  ALL_PREVIEW_ROLES,
  APP_ENV,
  ALLOW_ROLE_PREVIEW,
  PREVIEW_OPEN_ID_PREFIX,
  PREVIEW_ID_PREFIX,
  STATUS_TEXT,
  nowIso,
  sameId,
  trimText,
  normalizeReviewStatus,
  ALL_ROLES,
  normalizeShareToken,
  buildShareToken,
  parseExpiryTime,
  buildShareExpiresAt,
  buildCustomerEntryPath,
  normalizeRoles,
  hasRole,
  hasAnyRole,
  isRoleExpired,
  EXPIRABLE_ROLES,
  getEffectiveRoles,
  roleLabel,
  roleLabelText,
  getCollection,
  toId,
  toUpdateData,
  success,
  failure,
  PUBLIC_THROW_MESSAGES,
  toPublicError,
  toStringSafe,
  ensureCollections,
  getCurrentProfile,
  normalizePreviewRole,
  isPreviewAllowedForProfile,
  buildFormalProfile,
  buildPreviewProfile,
  applyPreviewProfile,
  getCallerProfile,
  isOwnerOrAdmin,
  assertProfile,
  assertApprovedProfile,
  canManageProduct,
  canViewProduct,
  canManageGroupOrder,
  canViewGroupOrder,
  getShareAccessError,
  getAllActive,
  getById,
  buildChanges,
  logOperation,
  getOptimalComboPrice,
  filterKeyword,
  isDurableAssetUrl,
  hasOnlyDurableAssetUrls,
  isDurableProfileAvatarUrl,
};
