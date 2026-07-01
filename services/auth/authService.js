import config from '~/config';
import { getRoleLabel, MVP_ROLE_OPTIONS, AUTH_ROLES } from './roleScope';

const AUTH_PROFILE_KEY = 'dao_you_ling_auth_profile';
const AUTH_SESSION_KEY = 'dao_you_ling_auth_session';

const nowIso = () => new Date().toISOString();

const DEFAULT_ROLE_PROFILES = Object.freeze({
  [AUTH_ROLES.OWNER]: {
    id: 1,
    displayName: '林秝帆',
    phone: '13800000001',
    city: '上海',
  },
  [AUTH_ROLES.ADMIN]: {
    id: 4,
    displayName: '运营管理员',
    phone: '13800000004',
    city: '上海',
  },
  [AUTH_ROLES.GUIDE]: {
    id: 2,
    displayName: '张领队',
    phone: '13800000002',
    city: '杭州',
  },
  [AUTH_ROLES.CUSTOMER]: {
    id: 3,
    displayName: '王客户',
    phone: '13800000003',
    city: '南京',
  },
});

const safeGetStorage = (key, fallback = null) => {
  try {
    return wx.getStorageSync(key) || fallback;
  } catch (err) {
    return fallback;
  }
};

const safeSetStorage = (key, value) => {
  try {
    wx.setStorageSync(key, value);
  } catch (err) {
    // Storage failure should not crash login UI; caller receives session/profile state.
  }
};

const wxLogin = () => new Promise((resolve) => {
  if (!wx.login) {
    resolve({ success: false, error: '当前环境不支持 wx.login' });
    return;
  }

  wx.login({
    success: res => resolve({ success: true, code: res.code || '' }),
    fail: err => resolve({ success: false, error: err.errMsg || 'wx.login 调用失败' }),
  });
});

const callCloudAuth = loginCode => new Promise((resolve) => {
  if (!config.cloudEnvId || !wx.cloud || !wx.cloud.callFunction) {
    resolve({ success: false, error: '未配置云环境或云函数' });
    return;
  }

  wx.cloud.callFunction({
    name: 'authLogin',
    data: { code: loginCode },
    success: res => resolve({
      success: true,
      data: res.result || {},
    }),
    fail: err => resolve({
      success: false,
      error: err.errMsg || '云函数 authLogin 调用失败',
    }),
  });
});

const buildMockOpenId = role => `mock-openid-${role}`;

const normalizeCloudProfile = (data, requestedRole) => {
  const role = data.role || requestedRole || AUTH_ROLES.GUIDE;
  const defaults = DEFAULT_ROLE_PROFILES[role] || DEFAULT_ROLE_PROFILES[AUTH_ROLES.GUIDE];
  const profile = data.profile || {};

  return {
    id: profile.id || data.id || defaults.id,
    openId: data.openId,
    unionId: data.unionId || '',
    role,
    roleLabel: getRoleLabel(role),
    displayName: profile.displayName || defaults.displayName,
    phone: profile.phone || defaults.phone,
    avatarUrl: profile.avatarUrl || '/static/avatar1.png',
    city: profile.city || defaults.city,
    status: profile.status || 'active',
    authSource: 'wechat-cloud',
    isMockOpenId: false,
  };
};

const normalizeMockProfile = role => {
  const defaults = DEFAULT_ROLE_PROFILES[role] || DEFAULT_ROLE_PROFILES[AUTH_ROLES.GUIDE];
  return {
    id: defaults.id,
    openId: buildMockOpenId(role),
    unionId: '',
    role,
    roleLabel: getRoleLabel(role),
    displayName: defaults.displayName,
    phone: defaults.phone,
    avatarUrl: '/static/avatar1.png',
    city: defaults.city,
    status: 'active',
    authSource: 'mock-auth-adapter',
    isMockOpenId: true,
  };
};

const mergeProfileTimestamps = (nextProfile) => {
  const stored = safeGetStorage(AUTH_PROFILE_KEY, null);
  const previous = stored && stored.openId === nextProfile.openId ? stored : null;
  const createdAt = previous && previous.createdAt ? previous.createdAt : nowIso();

  return {
    ...previous,
    ...nextProfile,
    createdAt,
    updatedAt: nowIso(),
  };
};

export const AuthService = {
  roleOptions: MVP_ROLE_OPTIONS,
  storageKey: AUTH_PROFILE_KEY,
  sessionKey: AUTH_SESSION_KEY,

  getCurrentProfile() {
    return safeGetStorage(AUTH_PROFILE_KEY, null);
  },

  getCurrentSession() {
    return safeGetStorage(AUTH_SESSION_KEY, null);
  },

  async login({ role = AUTH_ROLES.GUIDE } = {}) {
    const loginResult = await wxLogin();
    let profileSource = normalizeMockProfile(role);
    let authStatus = {
      wxLoginCalled: loginResult.success,
      wxLoginCodeAvailable: Boolean(loginResult.code),
      cloudOpenIdVerified: false,
      fallbackReason: loginResult.success ? '' : loginResult.error,
    };

    if (loginResult.success && loginResult.code) {
      const cloudResult = await callCloudAuth(loginResult.code);
      if (cloudResult.success && cloudResult.data && cloudResult.data.openId) {
        profileSource = normalizeCloudProfile(cloudResult.data, role);
        authStatus = {
          ...authStatus,
          cloudOpenIdVerified: true,
          fallbackReason: '',
        };
      } else {
        authStatus = {
          ...authStatus,
          fallbackReason: cloudResult.error || '云函数未返回 openId',
        };
      }
    }

    const profile = mergeProfileTimestamps(profileSource);
    const session = {
      openId: profile.openId,
      role: profile.role,
      authSource: profile.authSource,
      isMockOpenId: profile.isMockOpenId,
      cloudOpenIdVerified: authStatus.cloudOpenIdVerified,
      wxLoginCalled: authStatus.wxLoginCalled,
      wxLoginCodeAvailable: authStatus.wxLoginCodeAvailable,
      fallbackReason: authStatus.fallbackReason,
      updatedAt: nowIso(),
    };

    safeSetStorage(AUTH_PROFILE_KEY, profile);
    safeSetStorage(AUTH_SESSION_KEY, session);

    return { success: true, data: { profile, session } };
  },

  logout() {
    try {
      wx.removeStorageSync(AUTH_PROFILE_KEY);
      wx.removeStorageSync(AUTH_SESSION_KEY);
    } catch (err) {
      // Ignore storage cleanup failures.
    }
  },
};
