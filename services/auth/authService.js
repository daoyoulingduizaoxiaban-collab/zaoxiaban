import config from '~/config';
import {
  getRoleLabel,
  MVP_ROLE_OPTIONS,
  AUTH_ROLES,
  REVIEW_STATUS,
  isApprovedProfile,
  isRoleExpired,
  getEffectiveRoles,
  normalizeReviewStatus,
  normalizeRoles,
} from './roleScope';
import { callBackendFunction, isBackendConfigured, isLocalBackend } from '~/services/backend/backendCall';

const AUTH_PROFILE_KEY = 'dao_you_ling_auth_profile';
const AUTH_SESSION_KEY = 'dao_you_ling_auth_session';
const AUTH_ROLE_PREVIEW_KEY = 'dao_you_ling_role_preview';
const AUTH_REFRESH_THROTTLE_KEY = 'dao_you_ling_auth_refresh_throttle';
const REFRESH_SESSION_TTL_MS = 45 * 1000;
// 全局刷新节流窗口：增强编译下 authService 会随组件重载被重建成多份实例，
// 模块级缓存存不住，因此节流状态放 storage（跨实例/重载共享）。
const REFRESH_THROTTLE_MS = 15 * 1000;
const SESSION_STORAGE_KEYS = Object.freeze([
  'dao_you_ling_product_picker_result',
  'dao_you_ling_read_messages',
  'dao_you_ling_search_history',
]);
const SESSION_STORAGE_PREFIXES = Object.freeze([
  'dao_you_ling_tab_route_query:',
]);

const nowIso = () => new Date().toISOString();
let refreshSessionInFlight = null;
let lastRefreshSessionAt = 0;
let lastRefreshSessionResult = null;

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
    return false;
  }
  return true;
};

const safeRemoveStorage = (key) => {
  try {
    wx.removeStorageSync(key);
  } catch (err) {
    return false;
  }
  return true;
};

const resetRefreshSessionCache = () => {
  refreshSessionInFlight = null;
  lastRefreshSessionAt = 0;
  lastRefreshSessionResult = null;
  try { wx.removeStorageSync(AUTH_REFRESH_THROTTLE_KEY); } catch (e) { /* ignore */ }
};

const clearSessionStorage = () => {
  SESSION_STORAGE_KEYS.forEach(key => safeRemoveStorage(key));
  try {
    const info = wx.getStorageInfoSync ? wx.getStorageInfoSync() : null;
    const keys = info && Array.isArray(info.keys) ? info.keys : [];
    keys
      .filter(key => SESSION_STORAGE_PREFIXES.some(prefix => String(key).indexOf(prefix) === 0))
      .forEach(key => safeRemoveStorage(key));
  } catch (err) {
    // Session cleanup is best effort; auth state is still removed below.
  }
};

const ignorePreviewProfileInFormalMode = profile => profile;
const ignorePreviewSessionInFormalMode = session => session;

const buildStoredRefreshResult = () => {
  const profile = ignorePreviewProfileInFormalMode(safeGetStorage(AUTH_PROFILE_KEY, null));
  const session = ignorePreviewSessionInFormalMode(safeGetStorage(AUTH_SESSION_KEY, null));
  if (!profile && !session) return null;
  return { success: true, data: { profile, session } };
};

const canReuseRefreshResult = (profile, session) => {
  if (!lastRefreshSessionResult || !lastRefreshSessionResult.success) return false;
  if (Date.now() - lastRefreshSessionAt > REFRESH_SESSION_TTL_MS) return false;
  const cachedProfile = lastRefreshSessionResult.data && lastRefreshSessionResult.data.profile;
  const cachedSession = lastRefreshSessionResult.data && lastRefreshSessionResult.data.session;
  return Boolean(
    profile
    && session
    && cachedProfile
    && cachedSession
    && String(cachedProfile.openId || '') === String(profile.openId || '')
    && String(cachedSession.openId || '') === String(session.openId || '')
  );
};

const canBaseUseRolePreview = profile => Boolean(
  profile
  && !profile.isMockOpenId
  && normalizeReviewStatus(profile.reviewStatus || profile.status) === REVIEW_STATUS.APPROVED
  && normalizeRoles(profile).includes(AUTH_ROLES.OWNER)
);

const buildPreviewProfile = (profile, previewRole) => {
  if (!canBaseUseRolePreview(profile)) return profile;
  const role = previewRole || '';
  if (!role) return profile;
  if (role === 'visitor') {
    return {
      ...profile,
      role: '',
      roles: [],
      roleLabel: '游客',
      reviewStatus: '',
      status: '',
      isRolePreview: true,
      isVisitorPreview: true,
      realRoleLabel: profile.roleLabel,
    };
  }
  if (role === REVIEW_STATUS.DISABLED) {
    return {
      ...profile,
      role: AUTH_ROLES.CUSTOMER,
      roles: [AUTH_ROLES.CUSTOMER],
      roleLabel: getRoleLabel(AUTH_ROLES.CUSTOMER),
      reviewStatus: role,
      status: role,
      isRolePreview: true,
      realRoleLabel: profile.roleLabel,
    };
  }
  if (!Object.values(AUTH_ROLES).includes(role)) return profile;
  return {
    ...profile,
    role,
    roles: [role],
    roleLabel: getRoleLabel(role),
    reviewStatus: REVIEW_STATUS.APPROVED,
    status: REVIEW_STATUS.APPROVED,
    isRolePreview: true,
    realRoleLabel: profile.roleLabel,
  };
};

const wxLogin = () => new Promise((resolve) => {
  if (!wx.login) {
    resolve({ success: false, error: '当前设备无法发起微信登录' });
    return;
  }

  wx.login({
    success: res => resolve({ success: true, code: res.code || '' }),
    fail: () => resolve({ success: false, error: '微信登录失败，请稍后重试' }),
  });
});

const callCloudAuth = async (loginCode, requestedRole) => {
  if (!isBackendConfigured()) return { success: false, error: '账号服务暂时不可用' };
  const result = await callBackendFunction({
    name: 'authLogin',
    event: { code: loginCode, requestedRole },
    openId: config.localDevOpenId, // 云模式忽略；本地模式以此 openId 登录
  });
  if (result && result.openId) return { success: true, data: result };
  return { success: false, error: (result && result.error) || '微信账号验证失败' };
};

const buildRoleLabelText = roles => normalizeRoles(roles)
  .map(role => getRoleLabel(role))
  .join('、');

const normalizeCloudProfile = (data, requestedRole) => {
  const role = data.role || requestedRole || AUTH_ROLES.CUSTOMER;
  const profile = data.profile || {};
  const roles = normalizeRoles(profile.roles || data.roles || [], role);
  const roleLabel = buildRoleLabelText(roles) || getRoleLabel(role);

  return {
    id: profile.id || data.id || '',
    openId: data.openId,
    unionId: data.unionId || '',
    role,
    roles,
    requestedRole: profile.requestedRole || data.requestedRole || role,
    roleLabel,
    displayName: profile.displayName || '微信用户',
    phone: profile.phone || '',
    avatarUrl: profile.avatarUrl || '/static/avatar1.png',
    city: profile.city || '',
    providerId: profile.providerId || '',
    status: normalizeReviewStatus(profile.reviewStatus || profile.status || data.reviewStatus || data.status),
    reviewStatus: normalizeReviewStatus(profile.reviewStatus || profile.status || data.reviewStatus || data.status),
    roleExpiresAt: profile.roleExpiresAt || data.roleExpiresAt || '',
    rolesExpireAt: profile.rolesExpireAt || data.rolesExpireAt || profile.roleExpiresAt || data.roleExpiresAt || '',
    reviewRemark: profile.reviewRemark || data.reviewRemark || '',
    authSource: 'wechat-cloud',
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
    const profile = ignorePreviewProfileInFormalMode(safeGetStorage(AUTH_PROFILE_KEY, null));
    if (!config.allowRolePreview) return profile;
    const previewRole = safeGetStorage(AUTH_ROLE_PREVIEW_KEY, '');
    return buildPreviewProfile(profile, previewRole);
  },

  getRealProfile() {
    return ignorePreviewProfileInFormalMode(safeGetStorage(AUTH_PROFILE_KEY, null));
  },

  getCurrentSession() {
    return ignorePreviewSessionInFormalMode(safeGetStorage(AUTH_SESSION_KEY, null));
  },

  isFormalSession(profile = this.getCurrentProfile(), session = this.getCurrentSession()) {
    return Boolean(profile && session && session.cloudOpenIdVerified);
  },

  normalizeReviewStatus,

  isApproved(profile = this.getCurrentProfile()) {
    return isApprovedProfile(profile);
  },

  getAccessState(profile = this.getCurrentProfile()) {
    if (!profile) return 'logged_out';
    if (profile.isVisitorPreview) return 'logged_out';
    const status = normalizeReviewStatus(profile.reviewStatus || profile.status);
    // 到期但仍有有效角色（如 customer 基线）→ 视为 approved（客户功能仍在）；无任何有效角色才算 expired。
    if (status === REVIEW_STATUS.APPROVED && isRoleExpired(profile) && getEffectiveRoles(profile).length === 0) return 'expired';
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
      expired: '账号使用期限已过，请联系管理员',
      approved: '账号已通过审核',
    };
    return textMap[state] || textMap.logged_out;
  },

  isDemoSession() {
    return false;
  },

  canShowQaTools() {
    return false;
  },

  canUseRolePreview(profile = this.getRealProfile()) {
    return config.allowRolePreview && canBaseUseRolePreview(profile);
  },

  getRolePreview() {
    return safeGetStorage(AUTH_ROLE_PREVIEW_KEY, '');
  },

  applyRolePreview(role) {
    const profile = this.getRealProfile();
    if (!this.canUseRolePreview(profile)) {
      return { success: false, error: '当前账号不能使用角色预览' };
    }
    // A8 可预览身份：visitor / disabled / customer / guide / admin / owner
    // （pending_review、rejected、provider 已随模型简化移除，不再作为预览身份）。
    const allowed = [
      'visitor',
      REVIEW_STATUS.DISABLED,
      AUTH_ROLES.OWNER,
      AUTH_ROLES.ADMIN,
      AUTH_ROLES.GUIDE,
      AUTH_ROLES.CUSTOMER,
    ];
    if (!allowed.includes(role)) return { success: false, error: '未知预览身份' };
    safeSetStorage(AUTH_ROLE_PREVIEW_KEY, role);
    return { success: true, data: this.getCurrentProfile() };
  },

  clearRolePreview() {
    safeRemoveStorage(AUTH_ROLE_PREVIEW_KEY);
    return { success: true };
  },

  async login({ role = AUTH_ROLES.CUSTOMER } = {}) {
    if (!refreshSessionInFlight) resetRefreshSessionCache();
    const loginResult = await wxLogin();
    let profileSource = null;
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
          fallbackReason: cloudResult.error || '微信账号验证失败',
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
      roles: profile.roles || [profile.role],
      authSource: profile.authSource,
      cloudOpenIdVerified: authStatus.cloudOpenIdVerified,
      wxLoginCalled: authStatus.wxLoginCalled,
      wxLoginCodeAvailable: authStatus.wxLoginCodeAvailable,
      fallbackReason: authStatus.fallbackReason,
      reviewStatus: profile.reviewStatus || profile.status || '',
      roleExpiresAt: profile.roleExpiresAt || '',
      updatedAt: nowIso(),
    };

    safeSetStorage(AUTH_PROFILE_KEY, profile);
    safeSetStorage(AUTH_SESSION_KEY, session);

    return { success: true, data: { profile, session } };
  },

  async refreshSession() {
    if (refreshSessionInFlight) return refreshSessionInFlight;

    const currentProfile = this.getRealProfile();
    const currentSession = this.getCurrentSession();

    // 全局节流（storage 共享，跨模块实例/重载有效）：
    // 15s 内已成功刷新过同一 openId，直接复用当前档，不再打后端，杜绝 authLogin storm。
    if (currentProfile && currentSession) {
      const throttle = safeGetStorage(AUTH_REFRESH_THROTTLE_KEY, null);
      if (throttle
        && String(throttle.openId) === String(currentProfile.openId)
        && (Date.now() - Number(throttle.at || 0)) < REFRESH_THROTTLE_MS) {
        return { success: true, data: { profile: currentProfile, session: currentSession } };
      }
    }
    if (canReuseRefreshResult(currentProfile, currentSession)) {
      return buildStoredRefreshResult() || lastRefreshSessionResult;
    }

    refreshSessionInFlight = (async () => {
      if (!currentProfile || !currentSession) {
        return { success: false, error: '当前没有可刷新的正式登录状态' };
      }

      // 云模式需要 wxLogin 换 code；本地模式用固定 openId，无需 code。
      let code = '';
      if (!isLocalBackend()) {
        if (!currentSession.cloudOpenIdVerified) {
          return { success: false, error: '当前没有可刷新的正式登录状态' };
        }
        const loginResult = await wxLogin();
        if (!loginResult.success || !loginResult.code) {
          return { success: false, error: loginResult.error || '微信登录状态刷新失败' };
        }
        code = loginResult.code;
      }

      const cloudResult = await callCloudAuth(code, currentProfile.requestedRole || currentProfile.role);
      if (!cloudResult.success || !cloudResult.data || !cloudResult.data.openId) {
        return { success: false, error: cloudResult.error || '账号状态刷新失败，请稍后重试' };
      }
      if (String(cloudResult.data.openId) !== String(currentProfile.openId || '')) {
        return { success: false, error: '登录状态已变更，请重新登录' };
      }

      const profile = mergeProfileTimestamps(normalizeCloudProfile(cloudResult.data, currentProfile.role));
      const session = {
        ...currentSession,
        openId: profile.openId,
        role: profile.role,
        roles: profile.roles || [profile.role],
        authSource: profile.authSource,
        isMockOpenId: false,
        cloudOpenIdVerified: true,
        wxLoginCalled: true,
        wxLoginCodeAvailable: true,
        fallbackReason: '',
        reviewStatus: profile.reviewStatus || profile.status || '',
        roleExpiresAt: profile.roleExpiresAt || '',
        updatedAt: nowIso(),
      };
      safeSetStorage(AUTH_PROFILE_KEY, profile);
      safeSetStorage(AUTH_SESSION_KEY, session);
      return { success: true, data: { profile, session } };
    })();

    try {
      const result = await refreshSessionInFlight;
      if (result && result.success) {
        lastRefreshSessionAt = Date.now();
        lastRefreshSessionResult = buildStoredRefreshResult() || result;
        // 写全局节流状态（storage 共享）：后续 15s 内的刷新直接复用，跨模块实例/重载有效。
        const p = result.data && result.data.profile;
        if (p && p.openId) safeSetStorage(AUTH_REFRESH_THROTTLE_KEY, { at: Date.now(), openId: p.openId });
      }
      return result;
    } finally {
      refreshSessionInFlight = null;
    }
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
      roles: normalizeRoles(profilePatch.roles || currentProfile.roles, profilePatch.role || currentProfile.role),
      roleLabel: profilePatch.roleLabel || buildRoleLabelText(profilePatch.roles || currentProfile.roles || [profilePatch.role || currentProfile.role]) || getRoleLabel(profilePatch.role || currentProfile.role),
      roleExpiresAt: profilePatch.roleExpiresAt || currentProfile.roleExpiresAt || '',
      rolesExpireAt: profilePatch.rolesExpireAt || profilePatch.roleExpiresAt || currentProfile.rolesExpireAt || currentProfile.roleExpiresAt || '',
      reviewStatus: normalizeReviewStatus(profilePatch.reviewStatus || profilePatch.status || currentProfile.reviewStatus || currentProfile.status),
      status: normalizeReviewStatus(profilePatch.reviewStatus || profilePatch.status || currentProfile.reviewStatus || currentProfile.status),
    });
    safeSetStorage(AUTH_PROFILE_KEY, nextProfile);
    return { success: true, data: nextProfile };
  },

  logout() {
    resetRefreshSessionCache();
    const removedProfile = safeRemoveStorage(AUTH_PROFILE_KEY);
    const removedSession = safeRemoveStorage(AUTH_SESSION_KEY);
    clearSessionStorage();
    if (!removedProfile || !removedSession) return false;
    return true;
  },
};
