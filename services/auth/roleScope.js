export const AUTH_ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  GUIDE: 'guide',
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
});

export const ROLE_LABELS = Object.freeze({
  [AUTH_ROLES.OWNER]: '产品拥有者',
  [AUTH_ROLES.ADMIN]: '运营管理员',
  [AUTH_ROLES.GUIDE]: '导游/领队',
  [AUTH_ROLES.CUSTOMER]: '客户',
  [AUTH_ROLES.PROVIDER]: '供应商',
});

export const MVP_ROLE_OPTIONS = [
  { label: ROLE_LABELS[AUTH_ROLES.GUIDE], value: AUTH_ROLES.GUIDE },
  { label: ROLE_LABELS[AUTH_ROLES.CUSTOMER], value: AUTH_ROLES.CUSTOMER },
  { label: ROLE_LABELS[AUTH_ROLES.OWNER], value: AUTH_ROLES.OWNER },
  { label: ROLE_LABELS[AUTH_ROLES.ADMIN], value: AUTH_ROLES.ADMIN },
];

export const isOwnerOrAdmin = profile => (
  profile && (profile.role === AUTH_ROLES.OWNER || profile.role === AUTH_ROLES.ADMIN)
);

export const getRoleLabel = role => ROLE_LABELS[role] || '未定义角色';

export const canUseProviderPortal = profile => isOwnerOrAdmin(profile);

export const canUseAdminPortal = profile => isOwnerOrAdmin(profile);

const sameId = (a, b) => String(a) === String(b);

export const filterGroupOrdersByRole = (groupOrders, profile, customerOrders = []) => {
  if (!profile) return [];
  if (isOwnerOrAdmin(profile)) return groupOrders;

  if (profile.role === AUTH_ROLES.GUIDE) {
    return groupOrders.filter((order) => {
      const authorizedGuideIds = order.authorizedGuideIds || [];
      return sameId(order.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
    });
  }

  if (profile.role === AUTH_ROLES.CUSTOMER) {
    const visibleGroupOrderIds = customerOrders
      .filter(order => sameId(order.customerUserId, profile.id))
      .map(order => String(order.groupOrderId));
    return groupOrders.filter(order => visibleGroupOrderIds.includes(String(order.id)));
  }

  return [];
};

export const filterCustomerOrdersByRole = (customerOrders, groupOrders, profile) => {
  if (!profile) return [];
  if (isOwnerOrAdmin(profile)) return customerOrders;

  if (profile.role === AUTH_ROLES.GUIDE) {
    const visibleGroupOrderIds = groupOrders
      .filter((order) => {
        const authorizedGuideIds = order.authorizedGuideIds || [];
        return sameId(order.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
      })
      .map(order => String(order.id));
    return customerOrders.filter(order => visibleGroupOrderIds.includes(String(order.groupOrderId)));
  }

  if (profile.role === AUTH_ROLES.CUSTOMER) {
    return customerOrders.filter(order => sameId(order.customerUserId, profile.id));
  }

  return [];
};

export const filterProductsByRole = (products, profile) => {
  if (!profile) return [];
  const activeProducts = products.filter(product => !product.deletedAt);
  if (isOwnerOrAdmin(profile)) return activeProducts;

  if (profile.role === AUTH_ROLES.GUIDE) {
    return activeProducts.filter(product => (
      !product.ownerUserId
      || sameId(product.ownerUserId, profile.id)
      || product.visibility === 'public'
    ));
  }

  if (profile.role === AUTH_ROLES.PROVIDER) {
    return activeProducts.filter(product => sameId(product.providerId, profile.providerId || profile.id));
  }

  return [];
};

export const canManageProduct = (product, profile) => {
  if (!profile || !product) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role === AUTH_ROLES.GUIDE) {
    return !product.ownerUserId || sameId(product.ownerUserId, profile.id);
  }
  if (profile.role === AUTH_ROLES.PROVIDER) {
    return sameId(product.providerId, profile.providerId || profile.id);
  }
  return false;
};
