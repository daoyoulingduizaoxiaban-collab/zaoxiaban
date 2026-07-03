const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const users = db.collection('users');

const ROLE_GUIDE = 'guide';
const ROLE_CUSTOMER = 'customer';
const ROLE_PROVIDER = 'provider';
const ROLE_OWNER = 'owner';
const ROLE_ADMIN = 'admin';
const ACTIVE_STATUS = 'active';
const REVIEW_STATUS = {
  PENDING: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISABLED: 'disabled',
};

const parseOpenIdList = value => String(value || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const getPrivilegedRole = (openId) => {
  if (parseOpenIdList(process.env.OWNER_OPENIDS).includes(openId)) return ROLE_OWNER;
  if (parseOpenIdList(process.env.ADMIN_OPENIDS).includes(openId)) return ROLE_ADMIN;
  return '';
};

const getBootstrapRole = async () => {
  const existingPrivileged = await users.where({
    role: _.in([ROLE_OWNER, ROLE_ADMIN]),
    reviewStatus: REVIEW_STATUS.APPROVED,
    deletedAt: null,
  }).limit(1).get();
  return existingPrivileged.data && existingPrivileged.data.length ? '' : ROLE_OWNER;
};

const normalizeRequestedRole = role => (
  [ROLE_GUIDE, ROLE_CUSTOMER, ROLE_PROVIDER].includes(role) ? role : ROLE_GUIDE
);

const normalizeReviewStatus = status => (status === ACTIVE_STATUS ? REVIEW_STATUS.APPROVED : (status || REVIEW_STATUS.PENDING));
const normalizeRoles = (roles, fallbackRole = '') => {
  const rawRoles = Array.isArray(roles) ? [...roles, fallbackRole] : [fallbackRole];
  return [...new Set(rawRoles.filter(role => [ROLE_GUIDE, ROLE_CUSTOMER, ROLE_PROVIDER, ROLE_OWNER, ROLE_ADMIN].includes(role)))];
};
const buildRoleLabel = (role) => {
  const labels = {
    [ROLE_OWNER]: '产品拥有者',
    [ROLE_ADMIN]: '运营管理员',
    [ROLE_GUIDE]: '团主',
    [ROLE_CUSTOMER]: '客户',
    [ROLE_PROVIDER]: '供应商',
  };
  return labels[role] || role;
};

const getSystemReviewer = bootstrapRole => (bootstrapRole ? 'system-bootstrap-owner' : 'system-allowlist');
const getSystemReviewRemark = bootstrapRole => (bootstrapRole ? '首位管理者初始化' : '管理员白名单账号');

const ensureUsersCollection = async () => {
  try {
    await db.createCollection('users');
  } catch (err) {
    const message = err && (err.message || err.errMsg || err.toString());
    if (!/exist|exists|already|已存在/i.test(message || '')) {
      throw err;
    }
  }
};

const buildDefaultProfile = (openId, unionId, requestedRole, bootstrapRole = '') => {
  const privilegedRole = getPrivilegedRole(openId) || bootstrapRole;
  const normalizedRole = privilegedRole || normalizeRequestedRole(requestedRole);
  const reviewStatus = privilegedRole ? REVIEW_STATUS.APPROVED : REVIEW_STATUS.PENDING;
  const now = db.serverDate();
  const profile = {
    openId,
    unionId: unionId || '',
    role: normalizedRole,
    roles: [normalizedRole],
    requestedRole: privilegedRole ? normalizedRole : normalizeRequestedRole(requestedRole),
    roleExpiresAt: '',
    rolesExpireAt: '',
    displayName: '微信用户',
    phone: '',
    avatarUrl: '',
    status: reviewStatus,
    reviewStatus,
    reviewedBy: privilegedRole ? getSystemReviewer(bootstrapRole) : '',
    reviewedAt: privilegedRole ? now : '',
    reviewRemark: privilegedRole ? getSystemReviewRemark(bootstrapRole) : '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  if (normalizedRole === ROLE_PROVIDER) {
    profile.providerId = `provider-${openId}`;
  }
  return profile;
};

const toClientProfile = doc => ({
  id: doc._id,
  openId: doc.openId,
  unionId: doc.unionId || '',
  role: doc.role || ROLE_GUIDE,
  roles: normalizeRoles(doc.roles, doc.role || ROLE_GUIDE),
  requestedRole: doc.requestedRole || '',
  roleLabel: normalizeRoles(doc.roles, doc.role || ROLE_GUIDE).map(buildRoleLabel).join('、'),
  displayName: doc.displayName || '微信用户',
  phone: doc.phone || '',
  avatarUrl: doc.avatarUrl || '',
  providerId: doc.providerId || '',
  status: normalizeReviewStatus(doc.reviewStatus || doc.status || REVIEW_STATUS.PENDING),
  reviewStatus: normalizeReviewStatus(doc.reviewStatus || doc.status || REVIEW_STATUS.PENDING),
  roleExpiresAt: doc.roleExpiresAt || doc.rolesExpireAt || '',
  rolesExpireAt: doc.rolesExpireAt || doc.roleExpiresAt || '',
  reviewedBy: doc.reviewedBy || '',
  reviewedAt: doc.reviewedAt || '',
  reviewRemark: doc.reviewRemark || '',
  createdAt: doc.createdAt || '',
  updatedAt: doc.updatedAt || '',
});

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const unionId = wxContext.UNIONID || '';

  if (!openId) {
    return {
      success: false,
      error: '登录状态获取失败，请重新登录',
    };
  }

  await ensureUsersCollection();

  const existing = await users.where({ openId }).limit(1).get();

  if (existing.data && existing.data.length) {
    const profile = existing.data[0];
    const allowlistRole = getPrivilegedRole(openId);
    const bootstrapRole = allowlistRole ? '' : await getBootstrapRole();
    const privilegedRole = allowlistRole || bootstrapRole;
    const currentRole = profile.role || normalizeRequestedRole(event.requestedRole);
    const currentRoles = normalizeRoles(profile.roles, currentRole);
    const currentReviewStatus = normalizeReviewStatus(profile.reviewStatus || profile.status || REVIEW_STATUS.PENDING);
    const canUpdateRequestedRole = currentReviewStatus === REVIEW_STATUS.PENDING
      && [ROLE_GUIDE, ROLE_CUSTOMER, ROLE_PROVIDER].includes(currentRole);
    const nextRole = privilegedRole || currentRole;
    const nextRoles = privilegedRole ? normalizeRoles([privilegedRole], nextRole) : currentRoles;
    let nextRequestedRole = profile.requestedRole || currentRole;
    if (privilegedRole) {
      nextRequestedRole = profile.requestedRole || nextRole;
    } else if (canUpdateRequestedRole) {
      nextRequestedRole = normalizeRequestedRole(event.requestedRole);
    }
    const updateData = {
      unionId: profile.unionId || unionId,
      role: nextRole,
      roles: nextRoles,
      requestedRole: nextRequestedRole,
      status: privilegedRole ? REVIEW_STATUS.APPROVED : currentReviewStatus,
      reviewStatus: privilegedRole ? REVIEW_STATUS.APPROVED : currentReviewStatus,
      updatedAt: db.serverDate(),
    };
    if (privilegedRole && currentReviewStatus !== REVIEW_STATUS.APPROVED) {
      updateData.reviewedBy = getSystemReviewer(bootstrapRole);
      updateData.reviewedAt = db.serverDate();
      updateData.reviewRemark = getSystemReviewRemark(bootstrapRole);
    }
    if (nextRole === ROLE_PROVIDER && !profile.providerId) {
      updateData.providerId = `provider-${openId}`;
    }

    await users.doc(profile._id).update({ data: updateData });

    return {
      success: true,
      openId,
      unionId: updateData.unionId,
      role: nextRole,
      profile: toClientProfile({
        ...profile,
        ...updateData,
      }),
    };
  }

  const bootstrapRole = await getBootstrapRole();
  const profile = buildDefaultProfile(openId, unionId, event.requestedRole, bootstrapRole);
  const created = await users.add({ data: profile });

  return {
    success: true,
    openId,
    unionId,
    role: profile.role,
    profile: toClientProfile({
      _id: created._id,
      ...profile,
    }),
  };
};
