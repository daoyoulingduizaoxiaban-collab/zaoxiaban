import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText, hasRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { getMemberOrderStatusList } from '~/enum/MemberOrderStatus';
import { consumeTabRouteQuery, navigateByUrl, parseRouteQuery } from '~/utils/navigation';
import { useAccessPage } from '~/behaviors/useAccessPage';
import { RESULT_TEXT, toastSuccess, toastError } from '~/utils/feedback';

const MEMBER_ORDER_STATUS_TEXT = getMemberOrderStatusList()
  .reduce((map, item) => ({ ...map, [item.value]: item.label }), {});
const ROLE_TEXT = {
  customer: '客户',
  guide: '团主',
  owner: '产品拥有者',
  admin: '运营管理员',
};

Page({
  // access-state + 三态字段与 helper 来自 behavior（R1）
  behaviors: [useAccessPage],

  data: {
    titleText: '客户订单',
    allCustomerOrdersList: [],
    customerOrdersList: [],
    statusOptions: [{ label: '全部', value: -1 }, ...getMemberOrderStatusList()],
    currentStatus: -1,
    canCreateCustomerOrder: false,
    saveModeText: '',
    // 覆写 behavior 空态默认文案
    emptyText: '暂无客户订单',
    pendingOrderId: '',
    actionPanelVisible: false,
    detailVisible: false,
    selectedOrderDetail: null,
    actionType: '',
    actionOrderId: '',
    actionOrder: null,
    actionPanelTitle: '',
    actionSubmitText: '提交',
    isSubmittingAction: false,
  },

  getAvailableOrderActions(order, profile = AuthService.getCurrentProfile()) {
    const isCustomer = profile && hasRole(profile, 'customer');
    const isGuideOrAdmin = profile && (hasRole(profile, 'guide') || isOwnerOrAdmin(profile));
    const status = Number(order && order.status);
    const actions = [];

    if (isCustomer && status === 0) actions.push({ label: '声明已付款', action: 'declarePaid' });
    if (isCustomer && status !== 2 && status !== 3) actions.push({ label: '取消订单', action: 'cancelOrder' });
    if (isGuideOrAdmin && status === 1) actions.push({ label: '确认收款', action: 'confirmPayment' });
    if (isGuideOrAdmin && status !== 2 && status !== 3) actions.push({ label: '取消订单', action: 'cancelOrder' });

    return actions;
  },

  decorateOrdersForAction(list = [], profile = AuthService.getCurrentProfile()) {
    return list.map(order => ({
      ...order,
      canHandle: this.getAvailableOrderActions(order, profile).length > 0,
    }));
  },

  resetActionState(extraState = {}) {
    this.setData({
      actionPanelVisible: false,
      actionType: '',
      actionOrderId: '',
      actionOrder: null,
      actionPanelTitle: '',
      actionSubmitText: '提交',
      isSubmittingAction: false,
      detailVisible: false,
      selectedOrderDetail: null,
      ...extraState,
    });
  },

  async onLoad(options = {}) {
    (this as any)._skipNextShowRefresh = true;
    await AuthService.refreshSession();
    const pendingOrderId = options.orderId || options.id || '';
    const currentStatus = options.status !== undefined ? Number(options.status) : this.data.currentStatus;
    this.setData({
      pendingOrderId: pendingOrderId ? String(pendingOrderId) : '',
      currentStatus: Number.isNaN(currentStatus) ? this.data.currentStatus : currentStatus,
    });
    await this.loadOrders();
  },

  consumePendingRouteQuery() {
    const query = consumeTabRouteQuery('/pages/customerOrders/index');
    if (!query) return;
    const options = parseRouteQuery(query);
    const pendingOrderId = options.orderId || options.id || '';
    const currentStatus = options.status !== undefined ? Number(options.status) : this.data.currentStatus;
    if (pendingOrderId) {
      this.setData({ pendingOrderId: String(pendingOrderId) });
    }
    if (!Number.isNaN(currentStatus)) {
      this.setData({ currentStatus });
    }
  },

  async loadOrders() {
    if ((this as any)._loadOrdersInFlight) return (this as any)._loadOrdersInFlight;
    (this as any)._loadOrdersInFlight = (async () => {
    const profile = AuthService.getCurrentProfile();
    // 纯客户视角标题叫「我的订单」（与 NAV 文案一致）；团主/管理层仍叫「客户订单」。
    this.setData({ titleText: canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE) ? '客户订单' : '我的订单' });
    if (!canUseFeature(profile, FEATURE_KEYS.CUSTOMER_ORDERS)) {
      const accessText = getRoleScopeText(profile, FEATURE_KEYS.CUSTOMER_ORDERS);
      this.resetActionState({
        customerOrdersList: [],
        allCustomerOrdersList: [],
        roleScopeText: accessText,
        canCreateCustomerOrder: false,
        saveModeText: '',
        isLoggedIn: Boolean(profile),
        canUseBusiness: false,
        authReady: true,
        accessStateText: accessText,
        pendingOrderId: '',
        ...(this as any).threeState('empty'),
      });
      return;
    }

    this.setData((this as any).loadingState());
    const res = await CustomerOrderService.listVisible();
    if (!res.success) {
      const errorText = res.error || '加载客户订单失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.resetActionState({
        customerOrdersList: [],
        allCustomerOrdersList: [],
        roleScopeText: errorText,
        canCreateCustomerOrder: this.canCreateCustomerOrder(),
        saveModeText: '',
        isLoggedIn: Boolean(profile),
        canUseBusiness: true,
        authReady: true,
        accessStateText: AuthService.getAccessStateText(profile),
        ...(this as any).threeState('error', { errorText }),
      });
      return;
    }

    const orders = this.decorateOrdersForAction(res.data || [], AuthService.getCurrentProfile());
    const filtered = this.filterOrdersByStatus(orders, this.data.currentStatus);
    this.setData({
      allCustomerOrdersList: orders,
      customerOrdersList: filtered,
      roleScopeText: this.getRoleScopeText(res.meta),
      canCreateCustomerOrder: this.canCreateCustomerOrder() && orders.some(order => order.groupOrderId),
      saveModeText: AuthService.getCurrentProfile() ? getSaveModeText(res.meta) : '',
      isLoggedIn: Boolean(AuthService.getCurrentProfile()),
      canUseBusiness: true,
      authReady: true,
      accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
      ...(this as any).threeState(filtered.length ? 'ready' : 'empty', { emptyText: '暂无客户订单' }),
    });
    this.openPendingOrderDetail();
    })();
    try {
      return await (this as any)._loadOrdersInFlight;
    } finally {
      (this as any)._loadOrdersInFlight = null;
    }
  },

  filterOrdersByStatus(list = [], status = -1) {
    const statusValue = Number(status);
    if (statusValue < 0) return list;
    return list.filter(order => Number(order.status) === statusValue);
  },

  onStatusChange(e) {
    const status = Number(e.detail.value);
    const filtered = this.filterOrdersByStatus(this.data.allCustomerOrdersList, status);
    this.setData({
      currentStatus: status,
      customerOrdersList: filtered,
      ...(this as any).threeState(filtered.length ? 'ready' : 'empty', {
        emptyText: status < 0 ? '暂无客户订单' : '该状态下暂无订单',
      }),
    });
  },

  canCreateCustomerOrder() {
    return canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.CUSTOMER_ORDER_CREATE);
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/customerOrders/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  getRoleScopeText(meta = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) return AuthService.getAccessStateText(profile);
    const role = meta.role || (profile && profile.role);
    return getRoleScopeText({ ...profile, role }, FEATURE_KEYS.CUSTOMER_ORDERS);
  },

  async goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    await this.openOrderDetailById(id);
  },

  async openPendingOrderDetail() {
    const id = this.data.pendingOrderId;
    if (!id || this.data.loadErrorText || !this.data.canUseBusiness) return;
    this.setData({ pendingOrderId: '' });
    await this.openOrderDetailById(id);
  },

  async openOrderDetailById(id) {
    const res = await CustomerOrderService.getById(id);
    const item = res.success ? res.data : null;

    if (!item) {
      wx.showModal({
        title: '客户订单',
        content: res.error || '未找到订单资料。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    const detail = {
      ...item,
      displayItems: (item.items || item.productList || []).map(product => ({
        title: product.title || '商品资料',
        quantity: product.amount || product.quantity || 0,
        totalPrice: product.totalPrice || 0,
      })),
      displayHistory: (item.paymentHistory || []).map(history => ({
        createdAt: history.createdAt || '',
        actorText: [history.actorName, ROLE_TEXT[history.actorRole] || history.actorRole].filter(Boolean).join(' / '),
        statusText: history.toStatus !== undefined ? (MEMBER_ORDER_STATUS_TEXT[history.toStatus] || history.toStatus) : '',
        amount: Number(history.amount || 0) > 0 ? history.amount : '',
        paymentMethod: history.paymentMethod || '',
        proofText: Number(history.proofCount || 0) > 0 ? `${history.proofCount} 张` : '未上传凭证',
        note: history.note || '',
      })),
      proofText: item.paymentProofUrls && item.paymentProofUrls.length ? `${item.paymentProofUrls.length} 张` : '未上传凭证',
    };
    this.setData({
      detailVisible: true,
      selectedOrderDetail: detail,
    });
  },

  closeDetailPanel() {
    this.setData({ detailVisible: false, selectedOrderDetail: null });
  },

  onOrderAction(e) {
    const { id } = e.currentTarget.dataset;
    const order = this.data.customerOrdersList.find(item => String(item.id) === String(id));
    if (!order) {
      wx.showToast({ title: '未找到订单资料', icon: 'none' });
      return;
    }

    const actions = this.getAvailableOrderActions(order);

    if (actions.length === 0) {
      wx.showToast({ title: '当前订单暂无可执行操作', icon: 'none' });
      return;
    }

    wx.showActionSheet({
      itemList: actions.map(item => item.label),
      success: (res) => {
        const selected = actions[res.tapIndex];
        if (selected) this.openActionPanel(id, selected.action);
      }
    });
  },

  openActionPanel(id, action) {
    const panelConfig = {
      declarePaid: { title: '声明已付款', submitText: '提交付款资料' },
      confirmPayment: { title: '确认收款', submitText: '确认收款' },
      cancelOrder: { title: '取消订单', submitText: '确认取消' },
    };
    const config = panelConfig[action];
    if (!config) return;

    const order = [...this.data.customerOrdersList, ...this.data.allCustomerOrdersList]
      .find(item => String(item.id) === String(id));

    this.setData({
      actionPanelVisible: true,
      actionType: action,
      actionOrderId: id,
      actionOrder: order || null,
      actionPanelTitle: config.title,
      actionSubmitText: config.submitText,
      isSubmittingAction: false,
    });
  },

  closeActionPanel() {
    if (this.data.isSubmittingAction) return;
    this.resetActionState();
  },

  previewOrderPaymentProof(e) {
    const { id } = e.currentTarget.dataset;
    const order = [...this.data.customerOrdersList, ...this.data.allCustomerOrdersList]
      .find(item => String(item.id) === String(id));
    const urls = order && Array.isArray(order.paymentProofUrls) ? order.paymentProofUrls : [];
    if (!urls.length) {
      wx.showToast({ title: '当前订单没有付款凭证', icon: 'none' });
      return;
    }
    wx.previewImage({
      current: urls[0],
      urls,
      fail: () => wx.showToast({ title: '付款凭证预览失败', icon: 'none' }),
    });
  },

  getActionOrder() {
    const { actionOrderId, customerOrdersList, allCustomerOrdersList } = this.data;
    return [...customerOrdersList, ...allCustomerOrdersList].find(item => String(item.id) === String(actionOrderId));
  },

  // 组件校验通过后回传 payload；页面负责调服务 + 刷新
  async onActionSubmit(e) {
    const { actionOrderId, actionType, isSubmittingAction } = this.data;
    if (isSubmittingAction) return;
    if (!actionOrderId || !this.getActionOrder()) {
      wx.showToast({ title: '未找到订单资料，请重新进入后再操作', icon: 'none' });
      return;
    }

    const payload = (e.detail && e.detail.payload) || {};
    await this.runOrderAction(actionOrderId, actionType, payload);
  },

  async runOrderAction(id, action, actionPayload = {}) {
    const actionMap = {
      declarePaid: CustomerOrderService.declarePaid,
      confirmPayment: CustomerOrderService.confirmPayment,
      cancelOrder: CustomerOrderService.cancelOrder,
    };
    const runner = actionMap[action];
    if (!runner) return;

    this.setData({ isSubmittingAction: true });

    const res = await runner(id, actionPayload);
    if (!res.success) {
      this.setData({ isSubmittingAction: false });
      toastError(res.error);
      return;
    }

    await this.loadOrders();
    this.resetActionState();
    toastSuccess(RESULT_TEXT.update);
  },

  async onShow() {
    if ((this as any)._skipNextShowRefresh) {
      (this as any)._skipNextShowRefresh = false;
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().refreshTabBar();
      }
      return;
    }
    this.setData((this as any).loadingState());
    await AuthService.refreshSession();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabBar();
    }
    this.consumePendingRouteQuery();
    await this.loadOrders();
  },

  onGoToEdit(e) {
    if (!this.canCreateCustomerOrder()) {
      wx.showToast({ title: '客户需通过团单分享入口下单', icon: 'none' });
      return;
    }

    const firstOrder = this.data.allCustomerOrdersList.find(order => order.groupOrderId);
    const groupOrderId = firstOrder && firstOrder.groupOrderId;
    if (!groupOrderId) {
      wx.showToast({ title: '请从有效团单进入客户下单', icon: 'none' });
      return;
    }
    const url = `/pages/customerOrders/edit/index${groupOrderId ? `?groupOrderId=${groupOrderId}` : ''}`;

    navigateByUrl(url, {
      fail: () => wx.showToast({ title: '打开订单表单失败', icon: 'none' }),
    });
  }
});
