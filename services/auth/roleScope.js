export const AUTH_ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  GUIDE: 'guide',
  CUSTOMER: 'customer',
  // @deprecated provider 不再是登录/审核角色，已降级为团主管理的供应商实体（见 DOC Part A/B）。
  // 常量暂留以兼容历史数据读取，不得再分配给用户；彻底移除见 C-PROVIDER-ENTITY。
  PROVIDER: 'provider',
});

export const REVIEW_STATUS = Object.freeze({
  PENDING: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISABLED: 'disabled',
  EXPIRED: 'expired',
});

export const ROLE_LABELS = Object.freeze({
  [AUTH_ROLES.OWNER]: '产品拥有者',
  [AUTH_ROLES.ADMIN]: '运营管理员',
  [AUTH_ROLES.GUIDE]: '团主',
  [AUTH_ROLES.CUSTOMER]: '客户',
  [AUTH_ROLES.PROVIDER]: '供应商',
});

export const MVP_ROLE_OPTIONS = [
  { label: ROLE_LABELS[AUTH_ROLES.GUIDE], value: AUTH_ROLES.GUIDE },
  { label: ROLE_LABELS[AUTH_ROLES.CUSTOMER], value: AUTH_ROLES.CUSTOMER },
];

export const REVIEW_ROLE_OPTIONS = [
  { label: ROLE_LABELS[AUTH_ROLES.GUIDE], value: AUTH_ROLES.GUIDE },
  { label: ROLE_LABELS[AUTH_ROLES.CUSTOMER], value: AUTH_ROLES.CUSTOMER },
  { label: ROLE_LABELS[AUTH_ROLES.ADMIN], value: AUTH_ROLES.ADMIN },
];

export const FEATURE_KEYS = Object.freeze({
  HOME: 'home',
  GROUP_ORDERS: 'groupOrders',
  GROUP_ORDER_CREATE: 'groupOrderCreate',
  CUSTOMER_ORDERS: 'customerOrders',
  CUSTOMER_ORDER_CREATE: 'customerOrderCreate',
  DATA_CENTER: 'dataCenter',
  RELEASE: 'release',
  SEARCH: 'search',
  INFO_EDIT: 'infoEdit',
  SETTINGS: 'settings',
  USER_REVIEW: 'userReview',
  TOUR_GUIDES: 'tourGuides',
  PROVIDERS: 'providers',
  OPERATION_LOGS: 'operationLogs',
});

const FEATURE_ALLOWED_ROLES = Object.freeze({
  [FEATURE_KEYS.HOME]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.GROUP_ORDERS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.GROUP_ORDER_CREATE]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.CUSTOMER_ORDERS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.CUSTOMER_ORDER_CREATE]: [AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.DATA_CENTER]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.RELEASE]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.SEARCH]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.INFO_EDIT]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.SETTINGS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.USER_REVIEW]: [AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.TOUR_GUIDES]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  // 供应商实体由团主维护（owner/admin 可管全局）；provider 不再作为角色进入。
  [FEATURE_KEYS.PROVIDERS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.OPERATION_LOGS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
});

export const normalizeReviewStatus = status => (status === 'active' ? REVIEW_STATUS.APPROVED : (status || ''));

export const normalizeRoles = (profileOrRoles, fallbackRole = '') => {
  const rawRoles = Array.isArray(profileOrRoles)
    ? [...profileOrRoles, fallbackRole]
    : [
      ...((profileOrRoles && Array.isArray(profileOrRoles.roles)) ? profileOrRoles.roles : []),
      profileOrRoles && profileOrRoles.role,
      fallbackRole,
    ];
  return [...new Set(rawRoles.filter(role => Object.values(AUTH_ROLES).includes(role)))];
};

export const hasRole = (profile, role) => normalizeRoles(profile).includes(role);

// 与云端 lib/core.js 的 parseExpiryTime 互为镜像，改一边就要改另一边。
// 收三种写法：'YYYY-MM-DD'（当天最后一刻）、'YYYY-MM-DD HH:mm'、ISO。
// 中间那格空白一定要换成 T——小程序在 iOS 跑的是 JSCore，`new Date('2026-07-10 09:00')`
// 在那里是 Invalid Date，会让已过期的角色判成没过期，和云端对不上。
const parseExpiryTime = (value) => {
  if (!value) return 0;
  const text = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T23:59:59`
    : text.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const isRoleExpired = (profile, now = Date.now()) => {
  if (!profile || profile.isMockOpenId || profile.qaOverride) return false;
  const expiresAt = profile.roleExpiresAt || profile.rolesExpireAt || profile.expiresAt || '';
  const expiryTime = parseExpiryTime(expiresAt);
  return Boolean(expiryTime && expiryTime < now);
};

// 可过期的「提升角色」：到期后收回 guide/admin；customer 为基线、owner 为产品拥有者，均不过期。
// 例：customer+guide 到期 → effectiveRoles=[customer]，客户功能仍在、团主功能关（C2/A8）。
// 权限/可见性判定一律走 effectiveRoles；hasRole 保持「原始角色成员」语义供展示等使用。
const EXPIRABLE_ROLES = [AUTH_ROLES.GUIDE, AUTH_ROLES.ADMIN];

export const getEffectiveRoles = (profile) => {
  const roles = normalizeRoles(profile);
  if (!isRoleExpired(profile)) return roles;
  return roles.filter(role => !EXPIRABLE_ROLES.includes(role));
};

export const isApprovedProfile = (profile) => {
  if (!profile) return false;
  const approvedByStatus = profile.isMockOpenId
    || profile.qaOverride
    || normalizeReviewStatus(profile.reviewStatus || profile.status) === REVIEW_STATUS.APPROVED;
  if (!approvedByStatus) return false;
  // 到期后只要仍有有效角色（如 customer 基线）即可用；无任何有效角色才算过期。
  return getEffectiveRoles(profile).length > 0;
};

export const isOwnerOrAdmin = profile => (
  isApprovedProfile(profile)
  && (getEffectiveRoles(profile).includes(AUTH_ROLES.OWNER) || getEffectiveRoles(profile).includes(AUTH_ROLES.ADMIN))
);

export const getRoleLabel = role => ROLE_LABELS[role] || '未定义角色';

// 供应商实体管理：团主维护自己的供应商，owner/admin 可管全局。
export const canUseProviderPortal = profile => (
  isOwnerOrAdmin(profile) || (isApprovedProfile(profile) && getEffectiveRoles(profile).includes(AUTH_ROLES.GUIDE))
);

export const canUseAdminPortal = profile => isOwnerOrAdmin(profile);

export const canUseFeature = (profile, featureKey) => {
  if (!isApprovedProfile(profile)) return false;
  const allowedRoles = FEATURE_ALLOWED_ROLES[featureKey] || [];
  return getEffectiveRoles(profile).some(role => allowedRoles.includes(role));
};

export const getRoleScopeText = (profile, featureKey) => {
  if (!profile) return '请先登录后继续使用';
  if (!isApprovedProfile(profile)) return '当前账号暂无权限，请联系管理员';

  // 多角色/到期：按有效角色取最高优先级对应文案（owner/admin>guide>customer），单一 role 不再是唯一来源。
  const effectiveRoles = getEffectiveRoles(profile);
  const role = [AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER]
    .find(r => effectiveRoles.includes(r)) || profile.role;
  const textMap = {
    [FEATURE_KEYS.GROUP_ORDERS]: {
      [AUTH_ROLES.GUIDE]: '仅显示你创建或被授权管理的团单',
      [AUTH_ROLES.CUSTOMER]: '仅显示你下过订单关联的团单',
      [AUTH_ROLES.OWNER]: '当前为管理角色，可查看授权范围内团单',
      [AUTH_ROLES.ADMIN]: '当前为管理角色，可查看授权范围内团单',
    },
    [FEATURE_KEYS.CUSTOMER_ORDERS]: {
      [AUTH_ROLES.GUIDE]: '当前身份：团主｜仅显示你管理团单下的客户订单',
      [AUTH_ROLES.CUSTOMER]: '当前身份：客户｜仅显示你自己的客户订单',
      [AUTH_ROLES.OWNER]: '当前身份：管理角色｜可查看授权范围内客户订单',
      [AUTH_ROLES.ADMIN]: '当前身份：管理角色｜可查看授权范围内客户订单',
    },
  };

  return (textMap[featureKey] && textMap[featureKey][role]) || '当前账号暂无权限，请联系管理员';
};

const sameId = (a, b) => String(a) === String(b);

export const filterGroupOrdersByRole = (groupOrders, profile, customerOrders = []) => {
  if (!isApprovedProfile(profile)) return [];
  if (isOwnerOrAdmin(profile)) return groupOrders;

  if (getEffectiveRoles(profile).includes(AUTH_ROLES.GUIDE)) {
    return groupOrders.filter((order) => {
      const authorizedGuideIds = order.authorizedGuideIds || [];
      return sameId(order.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
    });
  }

  if (hasRole(profile, AUTH_ROLES.CUSTOMER)) {
    const visibleGroupOrderIds = customerOrders
      .filter(order => sameId(order.customerUserId, profile.id))
      .map(order => String(order.groupOrderId));
    return groupOrders.filter(order => visibleGroupOrderIds.includes(String(order.id)));
  }

  return [];
};

// 团单管理归属：owner/admin 全量；guide 仅本人创建或被授权管理的团单。
// 供 groupOrderRepository（管理动作门控）与 customerOrderService（详情可见范围收口）共用。
export const canManageGroupOrder = (groupOrder, profile) => {
  if (!profile || !groupOrder) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (!getEffectiveRoles(profile).includes(AUTH_ROLES.GUIDE)) return false;
  const authorizedGuideIds = groupOrder.authorizedGuideIds || [];
  return sameId(groupOrder.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
};

export const filterCustomerOrdersByRole = (customerOrders, groupOrders, profile) => {
  if (!isApprovedProfile(profile)) return [];
  if (isOwnerOrAdmin(profile)) return customerOrders;

  if (getEffectiveRoles(profile).includes(AUTH_ROLES.GUIDE)) {
    const visibleGroupOrderIds = groupOrders
      .filter((order) => {
        const authorizedGuideIds = order.authorizedGuideIds || [];
        return sameId(order.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
      })
      .map(order => String(order.id));
    return customerOrders.filter(order => visibleGroupOrderIds.includes(String(order.groupOrderId)));
  }

  if (hasRole(profile, AUTH_ROLES.CUSTOMER)) {
    return customerOrders.filter(order => sameId(order.customerUserId, profile.id));
  }

  return [];
};

