import { QaSeedMock } from '~/mock/qaSeed';
import { callBusinessData, getSaveModeText, isCloudBusinessEnabled } from './cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, isOwnerOrAdmin } from '~/services/auth/roleScope';

const USERS_STORAGE_KEY = 'dao_you_ling_local_users';
const PROVIDERS_STORAGE_KEY = 'dao_you_ling_local_providers';

const sameId = (a, b) => String(a) === String(b);
const nowIso = () => new Date().toISOString();

const safeGetStorage = (key, fallback) => {
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

const getLocalUsers = () => {
  const stored = safeGetStorage(USERS_STORAGE_KEY, null);
  if (stored && Array.isArray(stored.users)) return stored.users;
  const users = QaSeedMock.getUsers();
  safeSetStorage(USERS_STORAGE_KEY, { mode: 'local-directory-repository', users });
  return users;
};

const saveLocalUsers = (users) => {
  safeSetStorage(USERS_STORAGE_KEY, { mode: 'local-directory-repository', users });
};

const getLocalProviders = () => {
  const stored = safeGetStorage(PROVIDERS_STORAGE_KEY, null);
  if (stored && Array.isArray(stored.providers)) return stored.providers;
  const providers = QaSeedMock.getProviders();
  safeSetStorage(PROVIDERS_STORAGE_KEY, { mode: 'local-directory-repository', providers });
  return providers;
};

const saveLocalProviders = (providers) => {
  safeSetStorage(PROVIDERS_STORAGE_KEY, { mode: 'local-directory-repository', providers });
};

const userLabel = user => user.displayRole || user.roleLabel || user.role || '使用者';

const normalizeUser = user => ({
  ...user,
  id: user.id || user._id || `${Date.now()}`,
  name: user.name || user.displayName || '',
  displayName: user.displayName || user.name || '',
  displayRole: user.displayRole || user.roleLabel || userLabel(user),
  city: user.city || '',
  phone: user.phone || '',
  status: user.status || 'active',
  updatedAt: user.updatedAt || '',
});

const normalizeProvider = provider => ({
  ...provider,
  id: provider.id || provider._id || `P${Date.now()}`,
  title: provider.title || '',
  contact: provider.contact || '',
  statusText: provider.statusText || '可显示资料',
  note: provider.note || '',
  updatedAt: provider.updatedAt || '',
});

const canEditUser = (target, profile) => Boolean(
  profile && target && (
    isOwnerOrAdmin(profile)
    || sameId(target.id, profile.id)
    || sameId(target.openId, profile.openId)
  )
);

const visibleUsersForProfile = (users, profile) => {
  if (!profile) return [];
  if (isOwnerOrAdmin(profile)) return users;
  return users.filter(user => sameId(user.id, profile.id) || sameId(user.openId, profile.openId));
};

const callCloud = async (resource, action, data) => {
  if (!isCloudBusinessEnabled()) return null;
  return callBusinessData({ resource, action, data });
};

export const DirectoryRepository = {
  async listUsers() {
    const profile = AuthService.getCurrentProfile();
    const cloudRes = await callCloud('users', 'listVisible', {});
    if (cloudRes) return cloudRes;
    const users = visibleUsersForProfile(getLocalUsers().map(normalizeUser), profile);
    return {
      success: true,
      data: users,
      meta: { saveMode: 'local-directory-repository', saveModeText: getSaveModeText({}) },
    };
  },

  async listPendingUsers() {
    const profile = AuthService.getCurrentProfile();
    if (!isOwnerOrAdmin(profile)) return { success: false, error: '当前账号没有用户审核权限' };
    const cloudRes = await callCloud('users', 'listPending', {});
    if (cloudRes) return cloudRes;
    return {
      success: true,
      data: getLocalUsers().map(normalizeUser).filter(user => user.status === 'pending_review' || user.reviewStatus === 'pending_review'),
      meta: { saveMode: 'local-directory-repository' },
    };
  },

  async reviewUser(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!isOwnerOrAdmin(profile)) return { success: false, error: '当前账号没有用户审核权限' };
    const cloudRes = await callCloud('users', 'review', payload);
    if (cloudRes) return cloudRes;

    const users = getLocalUsers().map(normalizeUser);
    const target = users.find(user => sameId(user.id, payload.id));
    if (!target) return { success: false, error: '未找到用户' };
    const updatedAt = nowIso();
    const next = normalizeUser({
      ...target,
      role: payload.role || target.role,
      status: payload.reviewStatus,
      reviewStatus: payload.reviewStatus,
      reviewRemark: payload.reviewRemark || '',
      reviewedAt: updatedAt,
      reviewedBy: profile.openId || profile.id,
      updatedAt,
    });
    saveLocalUsers(users.map(user => (sameId(user.id, next.id) ? next : user)));
    return { success: true, data: next, meta: { saveMode: 'local-directory-repository' } };
  },

  async listGuides() {
    const res = await this.listUsers();
    if (!res.success) return res;
    return {
      ...res,
      data: res.data.filter(user => user.role === 'owner' || user.role === 'guide'),
    };
  },

  async getUserById(id) {
    const profile = AuthService.getCurrentProfile();
    const cloudRes = await callCloud('users', 'getById', { id });
    if (cloudRes) return cloudRes;
    const target = getLocalUsers().map(normalizeUser).find(user => sameId(user.id, id));
    if (!canEditUser(target, profile)) return { success: false, error: '当前账号没有资料查看权限' };
    return { success: true, data: target, meta: { saveMode: 'local-directory-repository' } };
  },

  async saveUser(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    const cloudRes = await callCloud('users', 'save', payload);
    if (cloudRes) return cloudRes;

    const users = getLocalUsers().map(normalizeUser);
    const existing = users.find(user => sameId(user.id, payload.id));
    if (payload.id && !canEditUser(existing, profile)) return { success: false, error: '当前账号没有保存权限' };
    if (!payload.id && !isOwnerOrAdmin(profile)) return { success: false, error: '当前账号不能新增资料' };

    const updatedAt = nowIso();
    const next = normalizeUser({
      ...(existing || {}),
      ...payload,
      name: payload.name || payload.displayName || (existing && existing.name) || '',
      displayName: payload.displayName || payload.name || (existing && existing.displayName) || '',
      updatedAt,
      createdAt: (existing && existing.createdAt) || updatedAt,
    });

    const nextUsers = existing
      ? users.map(user => (sameId(user.id, next.id) ? next : user))
      : [...users, next];
    saveLocalUsers(nextUsers);
    return { success: true, data: next, meta: { saveMode: 'local-directory-repository' } };
  },

  async listProviders() {
    const profile = AuthService.getCurrentProfile();
    if (!profile || (!isOwnerOrAdmin(profile) && profile.role !== AUTH_ROLES.PROVIDER)) return { success: false, error: '当前账号没有供应商资料管理权限' };
    const cloudRes = await callCloud('providers', 'listVisible', {});
    if (cloudRes) return cloudRes;
    const providers = getLocalProviders().map(normalizeProvider);
    return {
      success: true,
      data: isOwnerOrAdmin(profile)
        ? providers
        : providers.filter(provider => sameId(provider.id, profile.providerId || profile.id)),
      meta: { saveMode: 'local-directory-repository' },
    };
  },

  async getProviderById(id) {
    const profile = AuthService.getCurrentProfile();
    if (!profile || (!isOwnerOrAdmin(profile) && profile.role !== AUTH_ROLES.PROVIDER)) return { success: false, error: '当前账号没有供应商资料查看权限' };
    const cloudRes = await callCloud('providers', 'getById', { id });
    if (cloudRes) return cloudRes;
    const provider = getLocalProviders().map(normalizeProvider).find(item => sameId(item.id, id));
    if (provider && !isOwnerOrAdmin(profile) && !sameId(provider.id, profile.providerId || profile.id)) {
      return { success: false, error: '当前账号没有供应商资料查看权限' };
    }
    return provider
      ? { success: true, data: provider, meta: { saveMode: 'local-directory-repository' } }
      : { success: false, error: '未找到供应商资料' };
  },

  async saveProvider(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!profile || (!isOwnerOrAdmin(profile) && profile.role !== AUTH_ROLES.PROVIDER)) return { success: false, error: '当前账号没有供应商资料维护权限' };
    const scopedPayload = isOwnerOrAdmin(profile)
      ? payload
      : { ...payload, id: payload.id || profile.providerId || profile.id };
    const cloudRes = await callCloud('providers', 'save', scopedPayload);
    if (cloudRes) return cloudRes;

    const providers = getLocalProviders().map(normalizeProvider);
    const existing = providers.find(item => sameId(item.id, scopedPayload.id));
    const updatedAt = nowIso();
    const next = normalizeProvider({
      ...(existing || {}),
      ...scopedPayload,
      updatedAt,
      createdAt: (existing && existing.createdAt) || updatedAt,
    });
    const nextProviders = existing
      ? providers.map(item => (sameId(item.id, next.id) ? next : item))
      : [...providers, next];
    saveLocalProviders(nextProviders);
    return { success: true, data: next, meta: { saveMode: 'local-directory-repository' } };
  },
};
