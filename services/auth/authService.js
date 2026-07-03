import config from '~/config';
import { getRoleLabel, MVP_ROLE_OPTIONS, AUTH_ROLES, REVIEW_STATUS, isApprovedProfile, normalizeReviewStatus } from './roleScope';

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
  [AUTH_ROLES.PROVIDER]: {
    id: 5,
    providerId: 'provider-1',
    displayName: '杭州伴手礼供应商',
    phone: '13800000005',
    city: '杭州',
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

const ignorePreviewProfileInFormalMode = profile => (
  !config.isMock && profile && profile.isMockOpenId ? null : profile
);

const ignorePreviewSessionInFormalMode = session => (
  !config.isMock && session && session.isMockOpenId ? null : session
);

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

const callCloudAuth = (loginCode, requestedRole) => new Promise((resolve) => {
  if (!config.cloudEnvId || !wx.cloud || !wx.cloud.callFunction) {
    resolve({ success: false, error: '未配置云环境或云函数' });
    return;
  }

  wx.cloud.callFunction({
    name: 'authLogin',
    data: { code: loginCode, requestedRole },
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

const ALL_QA_ROLE_OPTIONS = Object.freeze(Object.values(AUTH_ROLES).map(role => ({
  label: getRoleLabel(role),
  value: role,
})));

const normalizeRole = role => (Object.values(AUTH_ROLES).includes(role) ? role : AUTH_ROLES.GUIDE);

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
    phone: profile.phone || '',
    avatarUrl: profile.avatarUrl || '/static/avatar1.png',
    city: profile.city || defaults.city,
    providerId: profile.providerId || defaults.providerId || '',
    status: normalizeReviewStatus(profile.reviewStatus || profile.status || data.reviewStatus || data.status),
    reviewStatus: normalizeReviewStatus(profile.reviewStatus || profile.status || data.reviewStatus || data.status),
    reviewRemark: profile.reviewRemark || data.reviewRemark || '',
    authSource: 'wechat-cloud',
    isMockOpenId: false,
  };
};

const normalizeMockProfile = (role, overrides = {}) => {
  const normalizedRole = normalizeRole(role);
  const defaults = DEFAULT_ROLE_PROFILES[normalizedRole] || DEFAULT_ROLE_PROFILES[AUTH_ROLES.GUIDE];
  return {
    id: defaults.id,
    providerId: defaults.providerId || '',
    openId: overrides.openId || buildMockOpenId(normalizedRole),
    unionId: '',
    role: normalizedRole,
    roleLabel: getRoleLabel(normalizedRole),
    displayName: defaults.displayName,
    phone: defaults.phone,
    avatarUrl: '/static/avatar1.png',
    city: defaults.city,
    status: 'active',
    reviewStatus: REVIEW_STATUS.APPROVED,
    authSource: 'mock-auth-adapter',
    isMockOpenId: true,
    qaOverride: Boolean(overrides.qaOverride),
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
  qaRoleOptions: ALL_QA_ROLE_OPTIONS,
  storageKey: AUTH_PROFILE_KEY,
  sessionKey: AUTH_SESSION_KEY,

  getCurrentProfile() {
    return ignorePreviewProfileInFormalMode(safeGetStorage(AUTH_PROFILE_KEY, null));
  },

  getCurrentSession() {
    return ignorePreviewSessionInFormalMode(safeGetStorage(AUTH_SESSION_KEY, null));
  },

  isFormalSession(profile = this.getCurrentProfile(), session = this.getCurrentSession()) {
    return Boolean(profile && session && !profile.isMockOpenId && session.cloudOpenIdVerified);
  },

  normalizeReviewStatus,

  isApproved(profile = this.getCurrentProfile()) {
    return isApprovedProfile(profile);
  },

  getAccessState(profile = this.getCurrentProfile()) {
    if (!profile) return 'logged_out';
    if (profile.isMockOpenId || profile.qaOverride) return 'approved';
    const status = normalizeReviewStatus(profile.reviewStatus || profile.status);
    if (status === REVIEW_STATUS.APPROVED) return 'approved';
    if (status === REVIEW_STATUS.REJECTED) return 'rejected';
    if (status === REVIEW_STATUS.DISABLED) return 'disabled';
    return 'pending_review';
  },

  canUseBusiness(profile = this.getCurrentProfile()) {
    return this.getAccessState(profile) === 'approved';
  },

  getAccessStateText(profile = this.getCurrentProfile()) {
    const state = this.getAccessState(profile);
    const textMap = {
      logged_out: '请先登录后继续使用',
      pending_review: '已提交使用申请，等待管理员确认身份',
      rejected: '当前账号暂不能使用，请联系管理员',
      disabled: '当前账号已停用，请联系管理员',
      approved: '账号已通过审核',
    };
    return textMap[state] || textMap.logged_out;
  },

  isDemoSession(profile = this.getCurrentProfile(), session = this.getCurrentSession()) {
    return Boolean(profile && (profile.isMockOpenId || (session && session.qaOverride)));
  },

  canShowQaTools(profile = this.getCurrentProfile(), session = this.getCurrentSession()) {
    return Boolean(config.isMock && profile && (profile.isMockOpenId || (session && session.qaOverride)));
  },

  async login({ role = AUTH_ROLES.GUIDE } = {}) {
    const loginResult = await wxLogin();
    let profileSource = config.isMock ? normalizeMockProfile(role) : null;
    let authStatus = {
      wxLoginCalled: loginResult.success,
      wxLoginCodeAvailable: Boolean(loginResult.code),
      cloudOpenIdVerified: false,
      fallbackReason: loginResult.success ? '' : loginResult.error,
    };

    if (loginResult.success && loginResult.code) {
      const cloudResult = await callCloudAuth(loginResult.code, role);
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

    if (!profileSource) {
      return {
        success: false,
        error: authStatus.fallbackReason || '微信登录验证失败',
      };
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
      reviewStatus: profile.reviewStatus || profile.status || '',
      updatedAt: nowIso(),
    };

    safeSetStorage(AUTH_PROFILE_KEY, profile);
    safeSetStorage(AUTH_SESSION_KEY, session);

    return { success: true, data: { profile, session } };
  },

  async refreshSession() {
    const currentProfile = this.getCurrentProfile();
    const currentSession = this.getCurrentSession();
    if (!currentProfile || currentProfile.isMockOpenId || !currentSession || !currentSession.cloudOpenIdVerified) {
      return { success: false, error: '当前没有可刷新的正式登录状态' };
    }

    const loginResult = await wxLogin();
    if (!loginResult.success || !loginResult.code) {
      return { success: false, error: loginResult.error || '微信登录状态刷新失败' };
    }

    const cloudResult = await callCloudAuth(loginResult.code, currentProfile.requestedRole || currentProfile.role);
    if (!cloudResult.success || !cloudResult.data || !cloudResult.data.openId) {
      return { success: false, error: cloudResult.error || '云端账号状态刷新失败' };
    }

    const profile = mergeProfileTimestamps(normalizeCloudProfile(cloudResult.data, currentProfile.role));
    const session = {
      ...currentSession,
      openId: profile.openId,
      role: profile.role,
      authSource: profile.authSource,
      isMockOpenId: false,
      cloudOpenIdVerified: true,
      wxLoginCalled: true,
      wxLoginCodeAvailable: true,
      fallbackReason: '',
      reviewStatus: profile.reviewStatus || profile.status || '',
      updatedAt: nowIso(),
    };
    safeSetStorage(AUTH_PROFILE_KEY, profile);
    safeSetStorage(AUTH_SESSION_KEY, session);
    return { success: true, data: { profile, session } };
  },

  applyQaOverride({ qaRoleOverride = AUTH_ROLES.GUIDE, qaOpenIdOverride = '' } = {}) {
    if (!config.isMock) {
      return {
        success: false,
        error: '演示身份切换仅允许在开发预览模式使用',
      };
    }

    const role = normalizeRole(qaRoleOverride);
    const profileSource = normalizeMockProfile(role, {
      openId: qaOpenIdOverride || buildMockOpenId(role),
      qaOverride: true,
    });
    const profile = mergeProfileTimestamps(profileSource);
    const session = {
      openId: profile.openId,
      role: profile.role,
      authSource: 'qa-role-override',
      isMockOpenId: true,
      qaOverride: true,
      cloudOpenIdVerified: false,
      wxLoginCalled: false,
      wxLoginCodeAvailable: false,
      fallbackReason: '演示身份切换，未调用正式登录',
      updatedAt: nowIso(),
    };

    safeSetStorage(AUTH_PROFILE_KEY, profile);
    safeSetStorage(AUTH_SESSION_KEY, session);

    return { success: true, data: { profile, session } };
  },

  updateCurrentProfile(profilePatch = {}) {
    const currentProfile = this.getCurrentProfile();
    if (!currentProfile) return { success: false, error: '当前没有登录资料' };
    const sameUser = (
      (profilePatch.id && String(profilePatch.id) === String(currentProfile.id))
      || (profilePatch.openId && String(profilePatch.openId) === String(currentProfile.openId))
    );
    if (!sameUser) return { success: false, error: '不能更新其他账号资料' };

    const nextProfile = mergeProfileTimestamps({
      ...currentProfile,
      ...profilePatch,
      role: profilePatch.role || currentProfile.role,
      roleLabel: profilePatch.roleLabel || getRoleLabel(profilePatch.role || currentProfile.role),
      reviewStatus: normalizeReviewStatus(profilePatch.reviewStatus || profilePatch.status || currentProfile.reviewStatus || currentProfile.status),
      status: normalizeReviewStatus(profilePatch.reviewStatus || profilePatch.status || currentProfile.reviewStatus || currentProfile.status),
    });
    safeSetStorage(AUTH_PROFILE_KEY, nextProfile);
    return { success: true, data: nextProfile };
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
