import { GroupOrder } from '~/models/GroupOrder';
import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import config from '~/config';
import { AuthService } from '~/services/auth/authService';
import { filterGroupOrdersByRole, hasRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { callBusinessData, CLOUD_SAVE_MODE, isCloudBusinessEnabled } from './cloudBusinessRepository';

const GROUP_ORDER_STORAGE_KEY = 'dao_you_ling_local_group_orders';
const CUSTOMER_ORDER_STORAGE_KEY = 'dao_you_ling_local_customer_orders';

const nowIso = () => new Date().toISOString();
const sameId = (a, b) => String(a) === String(b);
const parseDateTime = (value) => {
  if (!value) return 0;
  const text = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T23:59:59` : text.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const buildShareToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const buildShareExpiresAt = endAt => {
  const endTime = parseDateTime(endAt);
  const safeTime = endTime || Date.now();
  return new Date(safeTime).toISOString();
};

const normalizeShareToken = value => String(value || '').trim();
const buildCustomerEntryPath = (groupOrderId, shareToken = '') => {
  const basePath = `/pages/customerOrders/edit/index?groupOrderId=${encodeURIComponent(String(groupOrderId || ''))}`;
  const normalizedToken = normalizeShareToken(shareToken);
  return normalizedToken ? `${basePath}&shareToken=${encodeURIComponent(normalizedToken)}` : basePath;
};
const unavailableError = () => ({ success: false, error: '资料服务暂时不可用' });
const isSeedDataAllowed = () => Boolean(config.allowSeedDataFallback);

const safeGetStorage = (key, fallback = null) => {
  try {
    return wx.getStorageSync(key) || fallback;
  } catch (err) {
    return fallback;
  }
};

const saveState = (state) => {
  wx.setStorageSync(GROUP_ORDER_STORAGE_KEY, {
    ...state,
    updatedAt: nowIso(),
  });
};

const normalizeGroupOrder = (item) => {
  const order = new GroupOrder({
    ...item,
    authorizedGuideIds: item.authorizedGuideIds || [],
    productList: item.productList || [],
    memberOrderList: item.memberOrderList || [],
    createdAt: item.createdAt || nowIso(),
    updatedAt: item.updatedAt || nowIso(),
    deletedAt: item.deletedAt || '',
  });
  order.recalculateTotals();
  return order;
};

const getStoredState = () => {
  const stored = safeGetStorage(GROUP_ORDER_STORAGE_KEY, null);
  if (stored && stored.mode === 'local-group-order-repository' && Array.isArray(stored.groupOrders)) {
    return stored;
  }

  const state = {
    mode: 'local-group-order-repository',
    updatedAt: nowIso(),
    groupOrders: [],
  };
  saveState(state);
  return state;
};

const getAllGroupOrders = () => getStoredState().groupOrders
  .filter(item => !item.deletedAt)
  .map(normalizeGroupOrder);

const getAllCustomerOrders = () => {
  const stored = safeGetStorage(CUSTOMER_ORDER_STORAGE_KEY, null);
  if (stored && Array.isArray(stored.orders)) return stored.orders;
  return [];
};

const canManageGroupOrder = (groupOrder, profile) => {
  if (!profile || !groupOrder) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (!hasRole(profile, 'guide')) return false;
  const authorizedGuideIds = groupOrder.authorizedGuideIds || [];
  return sameId(groupOrder.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
};
const getShareAccessError = (groupOrder, profile, shareToken = '') => {
  if (!groupOrder) return '未找到团单';
  if (isOwnerOrAdmin(profile) || canManageGroupOrder(groupOrder, profile)) return '';
  const normalizedToken = normalizeShareToken(shareToken);
  if (!normalizedToken) return '请从分享链接进入团单';
  if (normalizeShareToken(groupOrder.shareToken) !== normalizedToken) return '分享链接无效';
  const shareExpireTime = parseDateTime(groupOrder.shareExpiresAt || groupOrder.endAt);
  if (!shareExpireTime || shareExpireTime <= Date.now()) return '分享入口已过期';
  const groupOrderEndTime = parseDateTime(groupOrder.endAt);
  if (groupOrderEndTime <= Date.now()) return '当前团单已停止收单';
  return '';
};

const canCreateGroupOrder = profile => (
  profile && (hasRole(profile, 'guide') || isOwnerOrAdmin(profile))
);

const canViewGroupOrder = (groupOrder, profile) => {
  if (!groupOrder || !profile) return false;
  if (canManageGroupOrder(groupOrder, profile)) return true;
  if (!hasRole(profile, 'customer')) return false;
  if (Number(groupOrder.status) === 1) return true;
  return getAllCustomerOrders().some(order => (
    sameId(order.groupOrderId, groupOrder.id)
    && sameId(order.customerUserId, profile.id)
  ));
};

const persistGroupOrders = (groupOrders) => {
  const state = getStoredState();
  saveState({
    ...state,
    groupOrders: groupOrders.map(normalizeGroupOrder),
  });
};

export const GroupOrderRepository = {
  storageKey: GROUP_ORDER_STORAGE_KEY,

  listAll() {
    return getAllGroupOrders();
  },

  async listVisible() {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({ resource: 'groupOrders', action: 'listVisible' });
    }

    if (!isSeedDataAllowed()) {
      return unavailableError();
    }

    const profile = AuthService.getCurrentProfile();
    const scoped = filterGroupOrdersByRole(getAllGroupOrders(), profile, getAllCustomerOrders());

    return {
      success: true,
      data: scoped,
      meta: {
        role: profile && profile.role,
        authSource: profile && profile.authSource,
        isMockOpenId: Boolean(profile && profile.isMockOpenId),
        saveMode: 'local-group-order-repository',
      },
    };
  },

  async filterVisible(keyword, status) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'listVisible',
        data: { keyword, status },
      });
    }

    if (!isSeedDataAllowed()) {
      return unavailableError();
    }

    const result = await this.listVisible();
    const lowerKeyword = (keyword || '').toLowerCase();
    const statusValue = Number(status || 0);
    let filtered = result.data;

    if (statusValue !== 0) {
      filtered = filtered.filter(item => Number(item.status) === statusValue);
    }

    if (lowerKeyword) {
      filtered = filtered.filter(item => (
        (item.title || '').toLowerCase().includes(lowerKeyword)
        || (item.description || '').toLowerCase().includes(lowerKeyword)
      ));
    }

    return {
      ...result,
      data: filtered,
    };
  },

  async getById(id, options = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'getById',
        data: { id },
      });
    }

    if (!isSeedDataAllowed()) {
      return unavailableError();
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrder = getAllGroupOrders().find(item => sameId(item.id, id));
    if (!groupOrder) return { success: false, error: '未找到团单' };
    if (!canViewGroupOrder(groupOrder, profile)) {
      return { success: false, error: '当前角色不能查看此团单' };
    }

    const shareAccessError = getShareAccessError(groupOrder, profile, options.shareToken);
    if (shareAccessError && hasRole(profile, 'customer')) {
      return { success: false, error: shareAccessError };
    }

    return {
      success: true,
      data: groupOrder,
      meta: { saveMode: 'local-group-order-repository' },
    };
  },

  async create(groupOrderData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'create',
        data: groupOrderData,
      });
    }

    if (!isSeedDataAllowed()) {
      return unavailableError();
    }

    const profile = AuthService.getCurrentProfile();
    if (!canCreateGroupOrder(profile)) return { success: false, error: '当前角色不能新建团单' };

    const createdAt = nowIso();
    const nextId = Date.now();
    const shareToken = normalizeShareToken(groupOrderData.shareToken || buildShareToken());
    const shareExpiresAt = buildShareExpiresAt(groupOrderData.endAt || nowIso());
    const nextOrder = normalizeGroupOrder({
      ...groupOrderData,
      id: nextId,
      ownerUserId: groupOrderData.ownerUserId || (isOwnerOrAdmin(profile) ? profile.id : 1),
      guideUserId: groupOrderData.guideUserId || profile.id,
      authorizedGuideIds: groupOrderData.authorizedGuideIds || [],
      shareToken,
      shareExpiresAt,
      sharePath: groupOrderData.sharePath || buildCustomerEntryPath(nextId, shareToken),
      status: Number(groupOrderData.status || GroupOrderStatus.OPEN),
      qrCodeUrl: groupOrderData.qrCodeUrl || '',
      startAt: groupOrderData.startAt || '',
      endAt: groupOrderData.endAt || '',
      pickupNote: groupOrderData.pickupNote || '',
      paymentNote: groupOrderData.paymentNote || '',
      contactName: groupOrderData.contactName || profile.displayName || '',
      contactPhone: groupOrderData.contactPhone || profile.phone || '',
      customerNotice: groupOrderData.customerNotice || '',
      productList: groupOrderData.productList || [],
      memberOrderList: [],
      createdAt,
      updatedAt: createdAt,
      deletedAt: '',
    });
    persistGroupOrders([...getAllGroupOrders(), nextOrder]);

    return {
      success: true,
      data: nextOrder,
      meta: { saveMode: 'local-group-order-repository' },
    };
  },

  async update(id, groupOrderData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'update',
        data: { id, data: groupOrderData },
      });
    }

    if (!isSeedDataAllowed()) {
      return unavailableError();
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrders = getAllGroupOrders();
    const target = groupOrders.find(item => sameId(item.id, id));
    if (!canManageGroupOrder(target, profile)) return { success: false, error: '当前角色不能编辑此团单' };
    const shareToken = normalizeShareToken(groupOrderData.shareToken || target.shareToken || buildShareToken());
    const shareExpiresAt = normalizeShareToken(groupOrderData.shareExpiresAt)
      || target.shareExpiresAt
      || buildShareExpiresAt(groupOrderData.endAt || target.endAt);

    const updated = normalizeGroupOrder({
      ...target,
      ...groupOrderData,
      id: target.id,
      shareToken,
      shareExpiresAt,
      sharePath: buildCustomerEntryPath(target.id, shareToken),
      status: Number(groupOrderData.status || target.status),
      updatedAt: nowIso(),
    });
    persistGroupOrders(groupOrders.map(item => (sameId(item.id, id) ? updated : item)));

    return {
      success: true,
      data: updated,
      meta: { saveMode: 'local-group-order-repository' },
    };
  },

  async addProducts(groupOrderId, products) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'addProducts',
        data: { groupOrderId, products },
      });
    }

    if (!isSeedDataAllowed()) {
      return unavailableError();
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrders = getAllGroupOrders();
    const target = groupOrders.find(item => sameId(item.id, groupOrderId));
    if (!canManageGroupOrder(target, profile)) return { success: false, error: '当前角色不能管理本团商品' };

    const existingIds = (target.productList || []).map(item => String(item.id));
    const nextProducts = [
      ...(target.productList || []),
      ...(products || []).filter(product => !existingIds.includes(String(product.id))),
    ];
    return this.update(groupOrderId, { productList: nextProducts });
  },

  async removeProduct(groupOrderId, productId) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'removeProduct',
        data: { groupOrderId, productId },
      });
    }

    if (!isSeedDataAllowed()) {
      return unavailableError();
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrders = getAllGroupOrders();
    const target = groupOrders.find(item => sameId(item.id, groupOrderId));
    if (!canManageGroupOrder(target, profile)) return { success: false, error: '当前角色不能移除本团商品' };

    const nextProducts = (target.productList || []).filter(product => !sameId(product.id, productId));
    return this.update(groupOrderId, { productList: nextProducts });
  },
};

GroupOrderRepository.cloudSaveMode = CLOUD_SAVE_MODE;
