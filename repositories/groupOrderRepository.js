import { GroupOrder } from '~/models/GroupOrder';
import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { filterGroupOrdersByRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { callBusinessData, CLOUD_SAVE_MODE, isCloudBusinessEnabled } from './cloudBusinessRepository';

const GROUP_ORDER_STORAGE_KEY = 'dao_you_ling_local_group_orders';
const CUSTOMER_ORDER_STORAGE_KEY = 'dao_you_ling_local_customer_orders';

const nowIso = () => new Date().toISOString();
const sameId = (a, b) => String(a) === String(b);

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
    groupOrders: QaSeedMock.getGroupOrders().map(normalizeGroupOrder),
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
  return QaSeedMock.getCustomerOrders();
};

const canManageGroupOrder = (groupOrder, profile) => {
  if (!profile || !groupOrder) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role !== 'guide') return false;
  const authorizedGuideIds = groupOrder.authorizedGuideIds || [];
  return sameId(groupOrder.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
};

const canCreateGroupOrder = profile => (
  profile && (profile.role === 'guide' || isOwnerOrAdmin(profile))
);

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

  async getById(id) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'groupOrders',
        action: 'getById',
        data: { id },
      });
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrder = getAllGroupOrders().find(item => sameId(item.id, id));
    if (!groupOrder) return { success: false, error: '未找到团单' };
    if (!canManageGroupOrder(groupOrder, profile) && !(profile && profile.role === 'customer')) {
      return { success: false, error: '当前角色不能查看此团单' };
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

    const profile = AuthService.getCurrentProfile();
    if (!canCreateGroupOrder(profile)) return { success: false, error: '当前角色不能新建团单' };

    const createdAt = nowIso();
    const nextOrder = normalizeGroupOrder({
      ...groupOrderData,
      id: Date.now(),
      ownerUserId: groupOrderData.ownerUserId || (isOwnerOrAdmin(profile) ? profile.id : 1),
      guideUserId: groupOrderData.guideUserId || profile.id,
      authorizedGuideIds: groupOrderData.authorizedGuideIds || [],
      status: Number(groupOrderData.status || GroupOrderStatus.OPEN),
      qrCodeUrl: groupOrderData.qrCodeUrl || '',
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

    const profile = AuthService.getCurrentProfile();
    const groupOrders = getAllGroupOrders();
    const target = groupOrders.find(item => sameId(item.id, id));
    if (!canManageGroupOrder(target, profile)) return { success: false, error: '当前角色不能编辑此团单' };

    const updated = normalizeGroupOrder({
      ...target,
      ...groupOrderData,
      id: target.id,
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

    const profile = AuthService.getCurrentProfile();
    const groupOrders = getAllGroupOrders();
    const target = groupOrders.find(item => sameId(item.id, groupOrderId));
    if (!canManageGroupOrder(target, profile)) return { success: false, error: '当前角色不能移除本团商品' };

    const nextProducts = (target.productList || []).filter(product => !sameId(product.id, productId));
    return this.update(groupOrderId, { productList: nextProducts });
  },
};

GroupOrderRepository.cloudSaveMode = CLOUD_SAVE_MODE;
