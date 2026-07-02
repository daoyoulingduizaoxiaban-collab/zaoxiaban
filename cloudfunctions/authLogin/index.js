const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const users = db.collection('users');

const ROLE_GUIDE = 'guide';
const ROLE_CUSTOMER = 'customer';
const ROLE_OWNER = 'owner';
const ROLE_ADMIN = 'admin';
const ACTIVE_STATUS = 'active';

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
  role === ROLE_CUSTOMER ? ROLE_CUSTOMER : ROLE_GUIDE
);

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
  const now = db.serverDate();
  return {
    openId,
    unionId: unionId || '',
    role: privilegedRole || normalizeRequestedRole(requestedRole),
    displayName: '微信用户',
    phone: '',
    avatarUrl: '',
    status: ACTIVE_STATUS,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
};

const toClientProfile = doc => ({
  id: doc._id,
  openId: doc.openId,
  unionId: doc.unionId || '',
  role: doc.role || ROLE_GUIDE,
  displayName: doc.displayName || '微信用户',
  phone: doc.phone || '',
  avatarUrl: doc.avatarUrl || '',
  status: doc.status || ACTIVE_STATUS,
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
    const nextRole = privilegedRole || profile.role || normalizeRequestedRole(event.requestedRole);
    const updateData = {
      unionId: profile.unionId || unionId,
      role: nextRole,
      updatedAt: db.serverDate(),
    };

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
