import { callBusinessData, getSaveModeText, isCloudBusinessEnabled } from './cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import config from '~/config';
import {
  AUTH_ROLES,
  REVIEW_STATUS,
  canUseProviderPortal,
  getRoleLabel,
  hasRole,
  isOwnerOrAdmin,
  normalizeReviewStatus,
  normalizeRoles,
} from '~/services/auth/roleScope';

const USERS_STORAGE_KEY = 'dao_you_ling_local_users';
const PROVIDERS_STORAGE_KEY = 'dao_you_ling_local_providers';

const sameId = (a, b) => String(a) === String(b);
const nowIso = () => new Date().toISOString();
const unavailableError = () => ({ success: false, error: '资料服务暂时不可用' });
const isLocalDirectoryFallbackAllowed = () => Boolean(config.allowSeedDataFallback);

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
  if (!isLocalDirectoryFallbackAllowed()) return null;
  const stored = safeGetStorage(USERS_STORAGE_KEY, null);
  if (stored && Array.isArray(stored.users)) return stored.users;
  const users = [];
  safeSetStorage(USERS_STORAGE_KEY, { mode: 'local-directory-repository', users });
  return users;
};

const saveLocalUsers = (users) => {
  if (!isLocalDirectoryFallbackAllowed()) return false;
  safeSetStorage(USERS_STORAGE_KEY, { mode: 'local-directory-repository', users });
  return true;
};

const getLocalProviders = () => {
  if (!isLocalDirectoryFallbackAllowed()) return null;
  const stored = safeGetStorage(PROVIDERS_STORAGE_KEY, null);
  if (stored && Array.isArray(stored.providers)) return stored.providers;
  const providers = [];
  safeSetStorage(PROVIDERS_STORAGE_KEY, { mode: 'local-directory-repository', providers });
  return providers;
};

const saveLocalProviders = (providers) => {
  if (!isLocalDirectoryFallbackAllowed()) return false;
  safeSetStorage(PROVIDERS_STORAGE_KEY, { mode: 'local-directory-repository', providers });
  return true;
};

const userLabel = user => user.displayRole || user.roleLabel || user.role || '使用者';

const buildRoleLabelText = roles => normalizeRoles(roles)
  .map(role => getRoleLabel(role))
  .join('、');

const isReviewableUser = user => !normalizeRoles(user.roles, user.role).includes(AUTH_ROLES.OWNER);

const normalizeUser = user => ({
  ...user,
  id: user.id || user._id || `${Date.now()}`,
  name: user.name || user.displayName || '',
  displayName: user.displayName || user.name || '',
  roles: normalizeRoles(user.roles, user.role),
  roleExpiresAt: user.roleExpiresAt || user.rolesExpireAt || '',
  rolesExpireAt: user.rolesExpireAt || user.roleExpiresAt || '',
  displayRole: user.displayRole || user.roleLabel || userLabel(user),
  city: user.city || '',
  phone: user.phone || '',
  status: user.status || 'active',
  updatedAt: user.updatedAt || '',
});

// D-6 供应商停用/软删除两档模型：
//   status：'active' 可选用 ／ 'disabled' 停用（可恢复，新团单不可选，历史订单不受影响）
//   deletedAt：非空＝软删除（彻底移出列表，仍保留快照供历史订单追溯）
const PROVIDER_STATUS = { ACTIVE: 'active', DISABLED: 'disabled' };

const normalizeProvider = provider => ({
  ...provider,
  id: provider.id || provider._id || `P${Date.now()}`,
  title: provider.title || '',
  contact: provider.contact || '',
  statusText: provider.statusText || '可显示资料',
  note: provider.note || '',
  status: provider.status === PROVIDER_STATUS.DISABLED ? PROVIDER_STATUS.DISABLED : PROVIDER_STATUS.ACTIVE,
  deletedAt: provider.deletedAt || '',
  updatedAt: provider.updatedAt || '',
});

// 供应商是否「有效」＝未停用且未软删除（选品/新团单可选用的判定）
const isProviderActive = provider => Boolean(
  provider && provider.status !== PROVIDER_STATUS.DISABLED && !provider.deletedAt
);

const isProviderDeleted = provider => Boolean(provider && provider.deletedAt);

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
    const localUsers = getLocalUsers();
    if (!localUsers) return unavailableError();
    const users = visibleUsersForProfile(localUsers.map(normalizeUser), profile);
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
    const localUsers = getLocalUsers();
    if (!localUsers) return unavailableError();
    return {
      success: true,
      data: localUsers.map(normalizeUser).filter(isReviewableUser),
      meta: { saveMode: 'local-directory-repository' },
    };
  },

  async reviewUser(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!isOwnerOrAdmin(profile)) return { success: false, error: '当前账号没有用户审核权限' };
    const cloudRes = await callCloud('users', 'review', payload);
    if (cloudRes) return cloudRes;
    const localUsers = getLocalUsers();
    if (!localUsers) return unavailableError();

    const users = localUsers.map(normalizeUser);
    const target = users.find(user => sameId(user.id, payload.id));
    if (!target) return { success: false, error: '未找到用户' };
    if (target.role === AUTH_ROLES.OWNER) return { success: false, error: '不能修改 owner 账号' };
    const requestedRoles = normalizeRoles(payload.roles, payload.role || target.requestedRole || target.role || AUTH_ROLES.CUSTOMER);
    if (hasRole(profile, AUTH_ROLES.ADMIN) && (requestedRoles.includes(AUTH_ROLES.OWNER) || normalizeRoles(target.roles, target.role).includes(AUTH_ROLES.ADMIN))) {
      return { success: false, error: '管理员不能指派 owner 或修改管理员账号' };
    }
    const nextStatus = normalizeReviewStatus(payload.reviewStatus);
    const allowedStatuses = [REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED, REVIEW_STATUS.DISABLED, REVIEW_STATUS.PENDING];
    if (!allowedStatuses.includes(nextStatus)) return { success: false, error: '审核状态无效' };
    const nextRoles = nextStatus === REVIEW_STATUS.APPROVED
      ? requestedRoles.filter(role => role !== AUTH_ROLES.OWNER)
      : normalizeRoles(target.roles, target.role || payload.role || AUTH_ROLES.CUSTOMER).filter(role => role !== AUTH_ROLES.OWNER);
    if (nextStatus === REVIEW_STATUS.APPROVED && !nextRoles.length) return { success: false, error: '请至少选择一个可用角色' };
    const nextRole = nextStatus === REVIEW_STATUS.APPROVED
      ? nextRoles[0]
      : (target.role || payload.role || AUTH_ROLES.CUSTOMER);
    if (nextRole === AUTH_ROLES.OWNER) return { success: false, error: '不能通过审核入口指派 owner' };
    const updatedAt = nowIso();
    const next = normalizeUser({
      ...target,
      role: nextRole,
      roles: nextRoles,
      roleLabel: buildRoleLabelText(nextRoles),
      displayRole: buildRoleLabelText(nextRoles),
      roleExpiresAt: payload.roleExpiresAt || '',
      rolesExpireAt: payload.roleExpiresAt || '',
      status: nextStatus,
      reviewStatus: nextStatus,
      reviewRemark: payload.reviewRemark || '',
      reviewedAt: updatedAt,
      reviewedBy: profile.openId || profile.id,
      updatedAt,
    });
    saveLocalUsers(users.map(user => (sameId(user.id, next.id) ? next : user)));
    return { success: true, data: next, meta: { saveMode: 'local-directory-repository' } };
  },

  async applyForRole(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!profile) return { success: false, error: '请先登录后提交申请' };
    const requestedRole = payload.requestedRole || AUTH_ROLES.GUIDE;
    if (![AUTH_ROLES.GUIDE, AUTH_ROLES.CUSTOMER, AUTH_ROLES.PROVIDER].includes(requestedRole)) {
      return { success: false, error: '申请身份无效' };
    }
    const cloudRes = await callCloud('users', 'applyForRole', { ...payload, requestedRole });
    if (cloudRes) return cloudRes;
    const localUsers = getLocalUsers();
    if (!localUsers) return unavailableError();

    const users = localUsers.map(normalizeUser);
    const existing = users.find(user => sameId(user.id, profile.id) || sameId(user.openId, profile.openId));
    if (!existing) return { success: false, error: '未找到当前账号资料' };
    const currentStatus = normalizeReviewStatus(existing.reviewStatus || existing.status || profile.reviewStatus || profile.status);
    if (currentStatus === REVIEW_STATUS.PENDING && existing.requestedRole === requestedRole) {
      return { success: false, error: '申请已提交，请等待管理员确认' };
    }
    if (currentStatus === REVIEW_STATUS.DISABLED) return { success: false, error: '当前账号已停用，请联系管理员' };
    if (existing.role === requestedRole && currentStatus === REVIEW_STATUS.APPROVED) {
      return { success: false, error: '当前账号已是该身份' };
    }

    const updatedAt = nowIso();
    const next = normalizeUser({
      ...existing,
      ...payload,
      id: existing.id,
      openId: existing.openId || profile.openId,
      unionId: existing.unionId || profile.unionId || '',
      role: existing.role || profile.role || AUTH_ROLES.CUSTOMER,
      roles: normalizeRoles(existing.roles, existing.role || profile.role || AUTH_ROLES.CUSTOMER),
      requestedRole,
      status: REVIEW_STATUS.PENDING,
      reviewStatus: REVIEW_STATUS.PENDING,
      reviewRemark: '',
      reviewedBy: '',
      reviewedAt: '',
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
    const localUsers = getLocalUsers();
    if (!localUsers) return unavailableError();
    const target = localUsers.map(normalizeUser).find(user => sameId(user.id, id));
    if (!canEditUser(target, profile)) return { success: false, error: '当前账号没有资料查看权限' };
    return { success: true, data: target, meta: { saveMode: 'local-directory-repository' } };
  },

  async saveUser(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    const cloudRes = await callCloud('users', 'save', payload);
    if (cloudRes) return cloudRes;
    const localUsers = getLocalUsers();
    if (!localUsers) return unavailableError();

    const users = localUsers.map(normalizeUser);
    const existing = users.find(user => sameId(user.id, payload.id));
    if (payload.id && !canEditUser(existing, profile)) return { success: false, error: '当前账号没有保存权限' };
    if (!payload.id && !isOwnerOrAdmin(profile)) return { success: false, error: '当前账号不能新增资料' };
    if (existing && existing.role === AUTH_ROLES.OWNER && profile && hasRole(profile, AUTH_ROLES.ADMIN)) {
      return { success: false, error: '管理员不能修改 owner 账号' };
    }

    const updatedAt = nowIso();
    const next = normalizeUser({
      ...(existing || {}),
      ...payload,
      name: payload.name || payload.displayName || (existing && existing.name) || '',
      displayName: payload.displayName || payload.name || (existing && existing.displayName) || '',
      updatedAt,
      createdAt: (existing && existing.createdAt) || updatedAt,
    });
    if (profile && hasRole(profile, AUTH_ROLES.ADMIN) && next.role === AUTH_ROLES.OWNER) {
      return { success: false, error: '管理员不能指派 owner' };
    }
    if (!isOwnerOrAdmin(profile)) {
      next.role = (existing && existing.role) || profile.role;
      next.roles = (existing && existing.roles) || profile.roles || [next.role];
      next.roleLabel = (existing && existing.roleLabel) || next.roleLabel || '';
      next.displayRole = (existing && (existing.displayRole || existing.roleLabel)) || next.displayRole || next.role;
      next.roleExpiresAt = (existing && existing.roleExpiresAt) || profile.roleExpiresAt || '';
      next.rolesExpireAt = (existing && existing.rolesExpireAt) || profile.rolesExpireAt || profile.roleExpiresAt || '';
      next.status = (existing && existing.status) || profile.status || REVIEW_STATUS.APPROVED;
      next.reviewStatus = (existing && (existing.reviewStatus || existing.status)) || profile.reviewStatus || profile.status || REVIEW_STATUS.APPROVED;
      next.requestedRole = (existing && existing.requestedRole) || profile.requestedRole || next.role;
      next.reviewedBy = (existing && existing.reviewedBy) || '';
      next.reviewedAt = (existing && existing.reviewedAt) || '';
      next.reviewRemark = (existing && existing.reviewRemark) || '';
      next.openId = (existing && existing.openId) || profile.openId;
      next.unionId = (existing && existing.unionId) || profile.unionId || '';
      next.providerId = (existing && existing.providerId) || profile.providerId || '';
    }

    const nextUsers = existing
      ? users.map(user => (sameId(user.id, next.id) ? next : user))
      : [...users, next];
    saveLocalUsers(nextUsers);
    return { success: true, data: next, meta: { saveMode: 'local-directory-repository' } };
  },

  async listProviders() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料管理权限' };
    const cloudRes = await callCloud('providers', 'listVisible', {});
    if (cloudRes) return cloudRes;
    const localProviders = getLocalProviders();
    if (!localProviders) return unavailableError();
    // D-6：软删除的供应商始终不进列表；停用的仍返回（带 status，供管理端恢复/标识）。
    const providers = localProviders.map(normalizeProvider).filter(provider => !isProviderDeleted(provider));
    return {
      success: true,
      data: isOwnerOrAdmin(profile)
        ? providers
        : providers.filter(provider => sameId(provider.id, profile.providerId || profile.id)),
      meta: { saveMode: 'local-directory-repository' },
    };
  },

  // D-6 内部用：跨服务（productService.listSelectable）判定供应商有效性，返回 id → 是否有效。
  // 只暴露 id/有效性，不含联系人等敏感资料，故不做可见范围收敛。
  async getProviderStatusMap() {
    const cloudRes = await callCloud('providers', 'statusMap', {});
    if (cloudRes) return cloudRes;
    const localProviders = getLocalProviders();
    if (!localProviders) return unavailableError();
    const map = {};
    localProviders.map(normalizeProvider).forEach((provider) => {
      map[String(provider.id)] = isProviderActive(provider);
    });
    return { success: true, data: map, meta: { saveMode: 'local-directory-repository' } };
  },

  async getProviderById(id) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料查看权限' };
    const cloudRes = await callCloud('providers', 'getById', { id });
    if (cloudRes) return cloudRes;
    const localProviders = getLocalProviders();
    if (!localProviders) return unavailableError();
    const provider = localProviders.map(normalizeProvider).find(item => sameId(item.id, id));
    if (provider && !isOwnerOrAdmin(profile) && !sameId(provider.id, profile.providerId || profile.id)) {
      return { success: false, error: '当前账号没有供应商资料查看权限' };
    }
    return provider
      ? { success: true, data: provider, meta: { saveMode: 'local-directory-repository' } }
      : { success: false, error: '未找到供应商资料' };
  },

  async saveProvider(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料维护权限' };
    const scopedPayload = isOwnerOrAdmin(profile)
      ? payload
      : { ...payload, id: payload.id || profile.providerId || profile.id };
    const cloudRes = await callCloud('providers', 'save', scopedPayload);
    if (cloudRes) return cloudRes;
    const localProviders = getLocalProviders();
    if (!localProviders) return unavailableError();

    const providers = localProviders.map(normalizeProvider);
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

  // D-6：停用/启用（可回切）。停用后该供应商的商品不再进新团单选品，历史订单不受影响。
  async setProviderStatus(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料维护权限' };
    const nextStatus = payload.status === PROVIDER_STATUS.DISABLED ? PROVIDER_STATUS.DISABLED : PROVIDER_STATUS.ACTIVE;
    const cloudRes = await callCloud('providers', 'setStatus', { id: payload.id, status: nextStatus });
    if (cloudRes) return cloudRes;
    const localProviders = getLocalProviders();
    if (!localProviders) return unavailableError();
    const providers = localProviders.map(normalizeProvider);
    const target = providers.find(item => sameId(item.id, payload.id));
    if (!target) return { success: false, error: '未找到供应商资料' };
    if (!isOwnerOrAdmin(profile) && !sameId(target.id, profile.providerId || profile.id)) {
      return { success: false, error: '当前账号没有供应商资料维护权限' };
    }
    if (isProviderDeleted(target)) return { success: false, error: '供应商已删除，无法变更状态' };
    const next = normalizeProvider({ ...target, status: nextStatus, updatedAt: nowIso() });
    saveLocalProviders(providers.map(item => (sameId(item.id, next.id) ? next : item)));
    return { success: true, data: next, meta: { saveMode: 'local-directory-repository' } };
  },

  // D-6：软删除（保留快照供历史订单追溯，仅移出列表与选品）。
  async removeProvider(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料维护权限' };
    const cloudRes = await callCloud('providers', 'remove', { id: payload.id });
    if (cloudRes) return cloudRes;
    const localProviders = getLocalProviders();
    if (!localProviders) return unavailableError();
    const providers = localProviders.map(normalizeProvider);
    const target = providers.find(item => sameId(item.id, payload.id));
    if (!target) return { success: false, error: '未找到供应商资料' };
    if (!isOwnerOrAdmin(profile) && !sameId(target.id, profile.providerId || profile.id)) {
      return { success: false, error: '当前账号没有供应商资料维护权限' };
    }
    if (isProviderDeleted(target)) return { success: true, data: target, meta: { saveMode: 'local-directory-repository' } };
    const next = normalizeProvider({ ...target, deletedAt: nowIso(), updatedAt: nowIso() });
    saveLocalProviders(providers.map(item => (sameId(item.id, next.id) ? next : item)));
    return { success: true, data: next, meta: { saveMode: 'local-directory-repository' } };
  },
};
