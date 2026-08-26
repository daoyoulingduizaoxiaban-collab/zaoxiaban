import { callBusinessData, isCloudBusinessEnabled } from './cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import {
  AUTH_ROLES,
  canUseProviderPortal,
  isOwnerOrAdmin,
} from '~/services/auth/roleScope';

const PROVIDER_STATUS = { ACTIVE: 'active', DISABLED: 'disabled' };

const unavailableError = () => ({ success: false, error: '资料服务暂时不可用' });

const callCloud = async (resource, action, data) => {
  if (!isCloudBusinessEnabled()) return null;
  return callBusinessData({ resource, action, data });
};

export const DirectoryRepository = {
  async listUsers() {
    const cloudRes = await callCloud('users', 'listVisible', {});
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  async listPendingUsers() {
    const profile = AuthService.getCurrentProfile();
    if (!isOwnerOrAdmin(profile)) return { success: false, error: '当前账号没有用户审核权限' };
    const cloudRes = await callCloud('users', 'listPending', {});
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  async reviewUser(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!isOwnerOrAdmin(profile)) return { success: false, error: '当前账号没有用户审核权限' };
    const cloudRes = await callCloud('users', 'review', payload);
    if (cloudRes) return cloudRes;
    return unavailableError();
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
    return unavailableError();
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
    const cloudRes = await callCloud('users', 'getById', { id });
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  async saveUser(payload = {}) {
    const cloudRes = await callCloud('users', 'save', payload);
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  async listProviders() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料管理权限' };
    const cloudRes = await callCloud('providers', 'listVisible', {});
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  // D-6 内部用：跨服务（productService.listSelectable）判定供应商有效性，返回 id → 是否有效。
  // 只暴露 id/有效性，不含联系人等敏感资料，故不做可见范围收敛。
  async getProviderStatusMap() {
    const cloudRes = await callCloud('providers', 'statusMap', {});
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  async getProviderById(id) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料查看权限' };
    const cloudRes = await callCloud('providers', 'getById', { id });
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  async saveProvider(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料维护权限' };
    const scopedPayload = isOwnerOrAdmin(profile)
      ? payload
      : { ...payload, id: payload.id || profile.providerId || profile.id };
    const cloudRes = await callCloud('providers', 'save', scopedPayload);
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  // D-6：停用/启用（可回切）。停用后该供应商的商品不再进新团单选品，历史订单不受影响。
  async setProviderStatus(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料维护权限' };
    const nextStatus = payload.status === PROVIDER_STATUS.DISABLED ? PROVIDER_STATUS.DISABLED : PROVIDER_STATUS.ACTIVE;
    const cloudRes = await callCloud('providers', 'setStatus', { id: payload.id, status: nextStatus });
    if (cloudRes) return cloudRes;
    return unavailableError();
  },

  // D-6：软删除（保留快照供历史订单追溯，仅移出列表与选品）。
  async removeProvider(payload = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) return { success: false, error: '当前账号没有供应商资料维护权限' };
    const cloudRes = await callCloud('providers', 'remove', { id: payload.id });
    if (cloudRes) return cloudRes;
    return unavailableError();
  },
};
