import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { filterCustomerOrdersByRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { MemberOrderStatus } from '~/enum/MemberOrderStatus';
import { GroupOrderRepository } from '~/repositories/groupOrderRepository';
import { callBusinessData, CLOUD_SAVE_MODE, isCloudBusinessEnabled } from './cloudBusinessRepository';

const CUSTOMER_ORDER_STORAGE_KEY = 'dao_you_ling_local_customer_orders';

const nowIso = () => new Date().toISOString();
const sameId = (a, b) => String(a) === String(b);
const trimText = value => String(value || '').trim();

const safeGetStorage = (key, fallback = null) => {
  try {
    return wx.getStorageSync(key) || fallback;
  } catch (err) {
    return fallback;
  }
};

const safeSetStorage = (key, value) => {
  wx.setStorageSync(key, value);
};

const getStatusText = (status) => {
  const statusMap = {
    [MemberOrderStatus.UNPAID]: '未付款',
    [MemberOrderStatus.PAID]: '客户付款',
    [MemberOrderStatus.CONFIRMED]: '已确认',
    [MemberOrderStatus.CANCELLED]: '已取消',
  };
  return statusMap[Number(status)] || '未知状态';
};

const getProductMap = () => {
  const map = {};
  QaSeedMock.getProducts().forEach((product) => {
    map[String(product.id)] = product;
  });
  return map;
};

const normalizeOrder = (order) => ({
  ...order,
  id: order.id,
  status: Number(order.status),
  paymentStatus: Number(order.paymentStatus !== undefined ? order.paymentStatus : order.status),
  statusText: order.statusText || getStatusText(order.status),
  items: order.items || order.productList || [],
  productList: order.productList || order.items || [],
  paymentHistory: order.paymentHistory || [],
  paymentMethod: order.paymentMethod || '',
  paymentRemark: order.paymentRemark || '',
  paymentProofUrls: order.paymentProofUrls || [],
  declaredAmount: order.declaredAmount || '',
  confirmedAmount: order.confirmedAmount || '',
  confirmRemark: order.confirmRemark || '',
  cancelRemark: order.cancelRemark || '',
  customerPhone: order.customerPhone || '',
  customerName: order.customerName || '客户',
  totalPrice: Number(order.totalPrice || 0),
  originalTotalPrice: Number(order.originalTotalPrice || order.totalPrice || 0),
});

const enrichSeedOrders = () => {
  const productMap = getProductMap();
  const groupOrders = QaSeedMock.getGroupOrders();
  const memberOrders = groupOrders.flatMap(groupOrder => (
    (groupOrder.memberOrderList || []).map(memberOrder => ({
      ...memberOrder,
      groupOrderTitle: groupOrder.title,
      guideUserId: groupOrder.guideUserId,
    }))
  ));

  return QaSeedMock.getCustomerOrders().map((order) => {
    const memberOrder = memberOrders.find(item => sameId(item.id, order.id));
    const productList = (memberOrder && memberOrder.productList ? memberOrder.productList : []).map((item) => {
      const product = productMap[String(item.productId)] || {};
      return {
        ...item,
        productId: item.productId,
        title: product.title || '商品资料',
        unitPrice: Number(item.amount) > 0 ? Number(item.totalPrice || 0) / Number(item.amount) : 0,
        pictureUrl: (product.pictureUrls && product.pictureUrls[0]) || '',
      };
    });

    return normalizeOrder({
      ...order,
      paymentStatus: order.status,
      productList,
      items: productList,
      customerPhone: order.customerPhone || '',
      memberRemark: memberOrder && memberOrder.memberRemark,
      hostRemark: memberOrder && memberOrder.hostRemark,
      createdAt: order.createdAt || nowIso(),
      updatedAt: order.updatedAt || nowIso(),
      paymentHistory: [
        {
          id: `${order.id}-seed`,
          customerOrderId: order.id,
          fromStatus: '',
          toStatus: Number(order.status),
          actorUserId: order.customerUserId,
          actorName: order.customerName || '客户',
          actorRole: 'customer',
          amount: Number(order.totalPrice || 0),
          paymentMethod: order.paymentMethod || '',
          proofCount: (order.paymentProofUrls || []).length || 0,
          note: '系统初始状态',
          createdAt: order.createdAt || nowIso(),
        },
      ],
    });
  });
};

const getStoredState = () => {
  const stored = safeGetStorage(CUSTOMER_ORDER_STORAGE_KEY, null);
  if (stored && stored.mode === 'local-customer-order-repository' && Array.isArray(stored.orders)) {
    return stored;
  }
  const seededState = {
    mode: 'local-customer-order-repository',
    updatedAt: nowIso(),
    orders: enrichSeedOrders(),
    payments: [],
  };
  safeSetStorage(CUSTOMER_ORDER_STORAGE_KEY, seededState);
  return seededState;
};

const saveState = (state) => {
  safeSetStorage(CUSTOMER_ORDER_STORAGE_KEY, {
    ...state,
    updatedAt: nowIso(),
  });
};

const getAllOrders = () => getStoredState().orders.map(normalizeOrder);

const canManageOrder = (order, groupOrders, profile) => {
  if (!profile || !order) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role !== 'guide') return false;
  const groupOrder = groupOrders.find(item => sameId(item.id, order.groupOrderId));
  if (!groupOrder) return false;
  const authorizedGuideIds = groupOrder.authorizedGuideIds || [];
  return sameId(groupOrder.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
};

const canViewSharedGroupOrder = (groupOrder, profile) => {
  if (!groupOrder) return false;
  if (!profile) return false;
  if (isOwnerOrAdmin(profile)) return true;
  if (profile.role === 'customer') return true;
  if (profile.role !== 'guide') return false;
  const authorizedGuideIds = groupOrder.authorizedGuideIds || [];
  return sameId(groupOrder.guideUserId, profile.id) || authorizedGuideIds.some(id => sameId(id, profile.id));
};

const appendHistory = (order, nextStatus, note, profile, payload = {}) => ({
  id: `${order.id}-${Date.now()}`,
  customerOrderId: order.id,
  fromStatus: Number(order.status),
  toStatus: Number(nextStatus),
  actorUserId: profile && profile.id,
  actorName: (profile && profile.displayName) || '',
  actorRole: profile && profile.role,
  amount: Number(payload.confirmedAmount || payload.declaredAmount || order.totalPrice || 0),
  paymentMethod: trimText(payload.paymentMethod) || order.paymentMethod || '',
  proofCount: Array.isArray(payload.paymentProofUrls) && payload.paymentProofUrls.length
    ? payload.paymentProofUrls.length
    : ((order.paymentProofUrls || []).length || 0),
  note,
  createdAt: nowIso(),
});

export const CustomerOrderRepository = {
  storageKey: CUSTOMER_ORDER_STORAGE_KEY,

  async listVisible() {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({ resource: 'customerOrders', action: 'listVisible' });
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrders = GroupOrderRepository.listAll();
    const customerOrders = getAllOrders();

    return {
      success: true,
      data: filterCustomerOrdersByRole(customerOrders, groupOrders, profile),
      meta: {
        role: profile && profile.role,
        authSource: profile && profile.authSource,
        isMockOpenId: Boolean(profile && profile.isMockOpenId),
        saveMode: 'local-customer-order-repository',
      },
    };
  },

  async listByGroupOrder(groupOrderId) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'listByGroupOrder',
        data: { groupOrderId },
      });
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrders = GroupOrderRepository.listAll();
    const groupOrder = groupOrders.find(item => sameId(item.id, groupOrderId));
    if (!canViewSharedGroupOrder(groupOrder, profile)) {
      return { success: false, error: '当前角色不能查看此团单订单' };
    }

    const orders = getAllOrders()
      .filter(order => sameId(order.groupOrderId, groupOrderId))
      .filter(order => profile.role !== 'customer' || sameId(order.customerUserId, profile.id));
    return {
      success: true,
      data: orders,
      meta: { saveMode: 'local-customer-order-repository' },
    };
  },

  async getById(id) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'getById',
        data: { id },
      });
    }

    const result = await this.listVisible();
    const order = result.data.find(item => sameId(item.id, id));
    if (!order) return { success: false, error: '未找到订单资料' };
    return { ...result, data: order };
  },

  async getGroupOrderEntry(groupOrderId) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'getGroupOrderEntry',
        data: { groupOrderId },
      });
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrder = GroupOrderRepository.listAll().find(item => sameId(item.id, groupOrderId));
    if (!groupOrder) return { success: false, error: '未找到团单' };
    if (!canViewSharedGroupOrder(groupOrder, profile)) {
      return { success: false, error: '当前角色不能进入此团单' };
    }
    return {
      success: true,
      data: groupOrder,
      meta: { saveMode: 'local-customer-order-repository' },
    };
  },

  async create(orderData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'create',
        data: orderData,
      });
    }

    const profile = AuthService.getCurrentProfile();
    if (!profile || (profile.role !== 'customer' && !isOwnerOrAdmin(profile))) {
      return { success: false, error: '当前角色不能提交客户订单' };
    }

    const groupOrder = GroupOrderRepository.listAll().find(item => sameId(item.id, orderData.groupOrderId));
    if (!groupOrder) return { success: false, error: '未找到团单' };
    if (Number(groupOrder.status) !== 1) return { success: false, error: '当前团单已停止收单' };

    const state = getStoredState();
    const createdAt = nowIso();
    const hasInitialPayment = Boolean(trimText(orderData.paymentMethod))
      && Array.isArray(orderData.paymentProofUrls)
      && orderData.paymentProofUrls.length > 0;
    const initialStatus = hasInitialPayment ? MemberOrderStatus.PAID : MemberOrderStatus.UNPAID;
    const nextOrder = normalizeOrder({
      id: Date.now(),
      groupOrderId: groupOrder.id,
      guideUserId: groupOrder.guideUserId,
      customerUserId: profile.id,
      customerName: orderData.customerName || profile.displayName || '客户',
      customerPhone: orderData.customerPhone || profile.phone || '',
      title: `${groupOrder.title} - ${orderData.customerName || profile.displayName || '客户'}`,
      status: initialStatus,
      paymentStatus: initialStatus,
      statusText: getStatusText(initialStatus),
      totalPrice: orderData.totalPrice,
      originalTotalPrice: orderData.totalPrice,
      items: orderData.items,
      productList: orderData.items,
      memberRemark: orderData.memberRemark || '',
      paymentMethod: orderData.paymentMethod || '',
      paymentRemark: orderData.paymentRemark || '',
      paymentProofUrls: orderData.paymentProofUrls || [],
      declaredAmount: hasInitialPayment ? Number(orderData.declaredAmount || orderData.totalPrice || 0) : '',
      confirmedAmount: '',
      confirmRemark: '',
      cancelRemark: '',
      hostRemark: '',
      createdAt,
      updatedAt: createdAt,
      paymentHistory: [
        {
          id: `${createdAt}-created`,
          customerOrderId: '',
          fromStatus: '',
          toStatus: initialStatus,
          actorUserId: profile.id,
          actorName: profile.displayName || '客户',
          actorRole: profile.role,
          amount: Number(orderData.totalPrice || 0),
          paymentMethod: orderData.paymentMethod || '',
          proofCount: (orderData.paymentProofUrls || []).length || 0,
          note: hasInitialPayment ? '客户提交订单并声明已付款' : '客户提交订单',
          createdAt,
        },
      ],
    });
    nextOrder.paymentHistory = nextOrder.paymentHistory.map(item => ({
      ...item,
      customerOrderId: nextOrder.id,
    }));

    saveState({
      ...state,
      orders: [...state.orders.map(normalizeOrder), nextOrder],
    });

    return {
      success: true,
      data: nextOrder,
      meta: { saveMode: 'local-customer-order-repository' },
    };
  },

  async updatePaymentStatus(id, nextStatus, note, payload = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'customerOrders',
        action: 'updatePaymentStatus',
        data: { id, nextStatus, note, ...payload },
      });
    }

    const profile = AuthService.getCurrentProfile();
    const groupOrders = GroupOrderRepository.listAll();
    const state = getStoredState();
    const orders = state.orders.map(normalizeOrder);
    const target = orders.find(order => sameId(order.id, id));
    if (!target) return { success: false, error: '未找到订单资料' };

    const nextStatusValue = Number(nextStatus);
    const isCustomerOwner = profile && profile.role === 'customer' && sameId(target.customerUserId, profile.id);
    const isManager = canManageOrder(target, groupOrders, profile);
    if (nextStatusValue === MemberOrderStatus.PAID && !isCustomerOwner && !isOwnerOrAdmin(profile)) {
      return { success: false, error: '只有下单客户可以声明已付款' };
    }
    if (nextStatusValue === MemberOrderStatus.CONFIRMED && !isManager) {
      return { success: false, error: '当前角色不能处理此订单' };
    }
    if (nextStatusValue === MemberOrderStatus.CANCELLED && !isManager && !isCustomerOwner) {
      return { success: false, error: '当前角色不能取消此订单' };
    }
    if (Number(target.status) === MemberOrderStatus.CONFIRMED && nextStatusValue !== MemberOrderStatus.CONFIRMED) {
      return { success: false, error: '已确认订单不能再变更状态' };
    }
    if (Number(target.status) === MemberOrderStatus.CANCELLED) {
      return { success: false, error: '已取消订单不能再变更状态' };
    }
    if (nextStatusValue === MemberOrderStatus.PAID && Number(target.status) === MemberOrderStatus.PAID) {
      return { success: false, error: '订单已声明付款，请等待确认' };
    }
    if (nextStatusValue === MemberOrderStatus.CONFIRMED && Number(target.status) !== MemberOrderStatus.PAID) {
      return { success: false, error: '只有客户已付款订单才能确认到账' };
    }
    if (nextStatusValue === MemberOrderStatus.PAID) {
      const hasProof = Array.isArray(payload.paymentProofUrls) && payload.paymentProofUrls.length > 0;
      const declaredAmount = Number(payload.declaredAmount || 0);
      if (declaredAmount <= 0) {
        return { success: false, error: '请填写有效付款金额' };
      }
      if (declaredAmount > Number(target.totalPrice || 0)) {
        return { success: false, error: '付款金额不能超过订单金额' };
      }
      if (!trimText(payload.paymentMethod)) {
        return { success: false, error: '请填写付款方式' };
      }
      if (!hasProof) {
        return { success: false, error: '请上传付款凭证' };
      }
    }
    if (nextStatusValue === MemberOrderStatus.CONFIRMED && Number(payload.confirmedAmount || 0) <= 0) {
      return { success: false, error: '请填写有效实收金额' };
    }
    if (nextStatusValue === MemberOrderStatus.CONFIRMED) {
      const declaredAmount = Number(target.declaredAmount || 0);
      const maxPayableAmount = declaredAmount > 0 ? declaredAmount : Number(target.totalPrice || 0);
      if (maxPayableAmount > 0 && Number(payload.confirmedAmount || 0) > maxPayableAmount) {
        return {
          success: false,
          error: declaredAmount > 0 ? '实收金额不能超过申报金额' : '实收金额不能超过订单金额',
        };
      }
    }

    const historyItem = appendHistory(target, nextStatusValue, note, profile, payload);
    const updatedOrder = normalizeOrder({
      ...target,
      status: nextStatusValue,
      paymentStatus: nextStatusValue,
      statusText: getStatusText(nextStatusValue),
      updatedAt: nowIso(),
      cancelledAt: nextStatusValue === MemberOrderStatus.CANCELLED ? nowIso() : target.cancelledAt,
      paymentMethod: trimText(payload.paymentMethod) || target.paymentMethod || '',
      paymentRemark: trimText(payload.paymentRemark) || target.paymentRemark || '',
      paymentProofUrls: Array.isArray(payload.paymentProofUrls) && payload.paymentProofUrls.length ? payload.paymentProofUrls : (target.paymentProofUrls || []),
      declaredAmount: payload.declaredAmount || target.declaredAmount || '',
      confirmedAmount: payload.confirmedAmount || target.confirmedAmount || '',
      confirmRemark: trimText(payload.confirmRemark) || target.confirmRemark || '',
      cancelRemark: trimText(payload.cancelRemark) || target.cancelRemark || '',
      paymentHistory: [...(target.paymentHistory || []), historyItem],
    });

    const payments = [...(state.payments || [])];
    if (nextStatusValue === MemberOrderStatus.CONFIRMED) {
      payments.push({
        id: `${target.id}-${Date.now()}`,
        customerOrderId: target.id,
        groupOrderId: target.groupOrderId,
        amount: target.totalPrice,
        declaredAmount: Number(updatedOrder.declaredAmount || target.totalPrice || 0),
        confirmedAmount: Number(payload.confirmedAmount || target.totalPrice || 0),
        method: payload.paymentMethod || target.paymentMethod || 'manual',
        status: 'confirmed',
        confirmedByUserId: profile && profile.id,
        confirmedAt: nowIso(),
        note: payload.confirmRemark || note || '导游确认收款',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    saveState({
      ...state,
      orders: orders.map(order => (sameId(order.id, id) ? updatedOrder : order)),
      payments,
    });

    return {
      success: true,
      data: updatedOrder,
      meta: { saveMode: 'local-customer-order-repository' },
    };
  },
};

CustomerOrderRepository.cloudSaveMode = CLOUD_SAVE_MODE;
