const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
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

const normalizeRequestedRole = role => (
  [ROLE_GUIDE, ROLE_CUSTOMER, ROLE_PROVIDER].includes(role) ? role : ROLE_GUIDE
);

const normalizeReviewStatus = status => (status === ACTIVE_STATUS ? REVIEW_STATUS.APPROVED : (status || REVIEW_STATUS.PENDING));

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

const buildDefaultProfile = (openId, unionId, requestedRole) => {
  const privilegedRole = getPrivilegedRole(openId);
  const normalizedRole = privilegedRole || normalizeRequestedRole(requestedRole);
  const reviewStatus = privilegedRole ? REVIEW_STATUS.APPROVED : REVIEW_STATUS.PENDING;
  const now = db.serverDate();
  const profile = {
    openId,
    unionId: unionId || '',
    role: normalizedRole,
    requestedRole: privilegedRole ? normalizedRole : normalizeRequestedRole(requestedRole),
    displayName: '微信用户',
    phone: '',
    avatarUrl: '',
    status: reviewStatus,
    reviewStatus,
    reviewedBy: privilegedRole ? 'system-allowlist' : '',
    reviewedAt: privilegedRole ? now : '',
    reviewRemark: privilegedRole ? '管理员白名单账号' : '',
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
  requestedRole: doc.requestedRole || '',
  displayName: doc.displayName || '微信用户',
  phone: doc.phone || '',
  avatarUrl: doc.avatarUrl || '',
  providerId: doc.providerId || '',
  status: normalizeReviewStatus(doc.reviewStatus || doc.status || REVIEW_STATUS.PENDING),
  reviewStatus: normalizeReviewStatus(doc.reviewStatus || doc.status || REVIEW_STATUS.PENDING),
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
      error: '未取得微信 OpenID',
    };
  }

  await ensureUsersCollection();

  const existing = await users.where({ openId }).limit(1).get();

  if (existing.data && existing.data.length) {
    const profile = existing.data[0];
    const privilegedRole = getPrivilegedRole(openId);
    const currentRole = profile.role || normalizeRequestedRole(event.requestedRole);
    const currentReviewStatus = normalizeReviewStatus(profile.reviewStatus || profile.status || REVIEW_STATUS.PENDING);
    const canSwitchRuntimeRole = currentRole === ROLE_GUIDE || currentRole === ROLE_CUSTOMER || currentRole === ROLE_PROVIDER;
    const nextRole = privilegedRole || (currentReviewStatus === REVIEW_STATUS.PENDING && canSwitchRuntimeRole ? normalizeRequestedRole(event.requestedRole) : currentRole);
    const updateData = {
      unionId: profile.unionId || unionId,
      role: nextRole,
      requestedRole: privilegedRole ? (profile.requestedRole || nextRole) : normalizeRequestedRole(event.requestedRole),
      status: privilegedRole ? REVIEW_STATUS.APPROVED : currentReviewStatus,
      reviewStatus: privilegedRole ? REVIEW_STATUS.APPROVED : currentReviewStatus,
      updatedAt: db.serverDate(),
    };
    if (privilegedRole && currentReviewStatus !== REVIEW_STATUS.APPROVED) {
      updateData.reviewedBy = 'system-allowlist';
      updateData.reviewedAt = db.serverDate();
      updateData.reviewRemark = '管理员白名单账号';
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

  const profile = buildDefaultProfile(openId, unionId, event.requestedRole);
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
