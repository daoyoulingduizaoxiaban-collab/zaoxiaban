export const AUTH_ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  GUIDE: 'guide',
  CUSTOMER: 'customer',
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
  { label: ROLE_LABELS[AUTH_ROLES.PROVIDER], value: AUTH_ROLES.PROVIDER },
];

export const REVIEW_ROLE_OPTIONS = [
  { label: ROLE_LABELS[AUTH_ROLES.GUIDE], value: AUTH_ROLES.GUIDE },
  { label: ROLE_LABELS[AUTH_ROLES.CUSTOMER], value: AUTH_ROLES.CUSTOMER },
  { label: ROLE_LABELS[AUTH_ROLES.PROVIDER], value: AUTH_ROLES.PROVIDER },
  { label: ROLE_LABELS[AUTH_ROLES.ADMIN], value: AUTH_ROLES.ADMIN },
];

export const FEATURE_KEYS = Object.freeze({
  HOME: 'home',
  GROUP_ORDERS: 'groupOrders',
  GROUP_ORDER_CREATE: 'groupOrderCreate',
  PRODUCTS: 'products',
  PRODUCT_MANAGE: 'productManage',
  CUSTOMER_ORDERS: 'customerOrders',
  CUSTOMER_ORDER_CREATE: 'customerOrderCreate',
  DATA_CENTER: 'dataCenter',
  RELEASE: 'release',
  MESSAGE: 'message',
  CHAT: 'chat',
  SEARCH: 'search',
  PROFILE: 'profile',
  INFO_EDIT: 'infoEdit',
  SETTINGS: 'settings',
  USER_REVIEW: 'userReview',
  TOUR_GUIDES: 'tourGuides',
  PROVIDERS: 'providers',
});

const FEATURE_ALLOWED_ROLES = Object.freeze({
  [FEATURE_KEYS.HOME]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.PROVIDER],
  [FEATURE_KEYS.GROUP_ORDERS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.GROUP_ORDER_CREATE]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.PRODUCTS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.PROVIDER],
  [FEATURE_KEYS.PRODUCT_MANAGE]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.PROVIDER],
  [FEATURE_KEYS.CUSTOMER_ORDERS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.CUSTOMER_ORDER_CREATE]: [AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.DATA_CENTER]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.RELEASE]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.MESSAGE]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.CHAT]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.SEARCH]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.PROFILE]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.PROVIDER],
  [FEATURE_KEYS.INFO_EDIT]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.PROVIDER],
  [FEATURE_KEYS.SETTINGS]: [AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.PROVIDER],
  [FEATURE_KEYS.USER_REVIEW]: [AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.TOUR_GUIDES]: [AUTH_ROLES.GUIDE, AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN],
  [FEATURE_KEYS.PROVIDERS]: [AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.PROVIDER],
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

const parseExpiryTime = (value) => {
  if (!value) return 0;
  const text = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T23:59:59` : text;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const isRoleExpired = (profile, now = Date.now()) => {
  if (!profile || profile.isMockOpenId || profile.qaOverride) return false;
  const expiresAt = profile.roleExpiresAt || profile.rolesExpireAt || profile.expiresAt || '';
  const expiryTime = parseExpiryTime(expiresAt);
  return Boolean(expiryTime && expiryTime < now);
};

export const isApprovedProfile = profile => Boolean(
  profile
  && !isRoleExpired(profile)
  && (
    profile.isMockOpenId
    || profile.qaOverride
    || normalizeReviewStatus(profile.reviewStatus || profile.status) === REVIEW_STATUS.APPROVED
  )
);

export const isOwnerOrAdmin = profile => (
  isApprovedProfile(profile) && (hasRole(profile, AUTH_ROLES.OWNER) || hasRole(profile, AUTH_ROLES.ADMIN))
);

export const getRoleLabel = role => ROLE_LABELS[role] || '未定义角色';

export const canUseProviderPortal = profile => (
  isOwnerOrAdmin(profile) || (isApprovedProfile(profile) && hasRole(profile, AUTH_ROLES.PROVIDER))
);

export const canUseAdminPortal = profile => isOwnerOrAdmin(profile);

export const canUseFeature = (profile, featureKey) => {
  if (!isApprovedProfile(profile)) return false;
  const allowedRoles = FEATURE_ALLOWED_ROLES[featureKey] || [];
  return normalizeRoles(profile).some(role => allowedRoles.includes(role));
};

export const getRoleScopeText = (profile, featureKey) => {
  if (!profile) return '请先登录后继续使用';
  if (!isApprovedProfile(profile)) return '当前账号暂无权限，请联系管理员';

  const { role } = profile;
  const textMap = {
    [FEATURE_KEYS.GROUP_ORDERS]: {
      [AUTH_ROLES.GUIDE]: '仅显示你创建或被授权管理的团单',
      [AUTH_ROLES.CUSTOMER]: '仅显示你下过订单关联的团单',
      [AUTH_ROLES.OWNER]: '当前为管理角色，可查看授权范围内团单',
      [AUTH_ROLES.ADMIN]: '当前为管理角色，可查看授权范围内团单',
    },
    [FEATURE_KEYS.PRODUCTS]: {
      [AUTH_ROLES.GUIDE]: '仅显示你可管理或可使用的商品',
      [AUTH_ROLES.CUSTOMER]: '仅显示可下单商品',
      [AUTH_ROLES.OWNER]: '当前为管理角色，可查看授权范围内商品',
      [AUTH_ROLES.ADMIN]: '当前为管理角色，可查看授权范围内商品',
      [AUTH_ROLES.PROVIDER]: '仅显示你提供的商品',
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

  if (hasRole(profile, AUTH_ROLES.GUIDE)) {
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

export const filterCustomerOrdersByRole = (customerOrders, groupOrders, profile) => {
  if (!isApprovedProfile(profile)) return [];
  if (isOwnerOrAdmin(profile)) return customerOrders;

  if (hasRole(profile, AUTH_ROLES.GUIDE)) {
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

export const filterProductsByRole = (products, profile) => {
  const activeProducts = products.filter(product => !product.deletedAt);
  const publicProducts = activeProducts.filter(product => (
    Number(product.status) === 2
    && product.visibility !== 'private'
  ));

  if (!isApprovedProfile(profile)) return publicProducts;
  if (isOwnerOrAdmin(profile)) return activeProducts;

  if (hasRole(profile, AUTH_ROLES.GUIDE)) {
    return activeProducts.filter(product => (
      !product.ownerUserId
      || sameId(product.ownerUserId, profile.id)
      || product.visibility === 'public'
    ));
  }

  if (hasRole(profile, AUTH_ROLES.PROVIDER)) {
    return activeProducts.filter(product => sameId(product.providerId, profile.providerId || profile.id));
  }

  if (hasRole(profile, AUTH_ROLES.CUSTOMER)) {
    return publicProducts;
  }

  return [];
};

export const canManageProduct = (product, profile) => {
  if (!isApprovedProfile(profile) || !product) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (hasRole(profile, AUTH_ROLES.GUIDE)) {
    return !product.ownerUserId || sameId(product.ownerUserId, profile.id);
  }
  if (hasRole(profile, AUTH_ROLES.PROVIDER)) {
    return sameId(product.providerId, profile.providerId || profile.id);
  }
  return false;
};
