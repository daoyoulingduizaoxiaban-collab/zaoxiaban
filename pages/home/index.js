import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { navigateByUrl } from '~/utils/navigation';

const TAB_URLS = new Set([
  '/pages/groupOrder/index',
  '/pages/customerOrders/index',
  '/pages/productManagement/index',
  '/pages/my/index',
]);

Page({
  data: {
    titleText: '工作台',
    modeText: '请先登录；通过审核后即可使用业务功能。',
    accessState: 'logged_out',
    accessStateText: '请先登录后继续使用',
    authReady: false,
    isAccessLoading: true,
    canUseBusiness: false,
    canCreateGroupOrder: false,
    canViewGroupOrders: false,
    canViewProducts: false,
    canViewCustomerOrders: false,
    canViewDataCenter: false,
    canApplyProvider: false,
    canViewOperationLogs: false,
    isSummaryLoading: false,
    summaryCards: [
      { label: '进行中团单', value: 0, target: 'groupOrders' },
      { label: '待确认收款', value: 0, target: 'pendingPayments' },
      { label: '客户订单', value: 0, target: 'customerOrders' },
    ],
  },

  async onLoad() {
    await this.refreshModeText();
  },

  async onShow() {
    await this.refreshModeText();
  },

  async refreshModeText() {
    this.setData({ authReady: false, isAccessLoading: true });
    await AuthService.refreshSession();
    const session = AuthService.getCurrentSession();
    const profile = AuthService.getCurrentProfile();
    const cloudEnabled = isCloudBusinessEnabled();
    const accessState = AuthService.getAccessState(profile);
    const canUseBusiness = AuthService.canUseBusiness(profile);
    let modeText = '请先登录；通过审核后即可使用业务功能。';

    if (!canUseBusiness) {
      modeText = AuthService.getAccessStateText(profile);
    } else if (profile && cloudEnabled && session && session.cloudOpenIdVerified) {
      modeText = '当前账号已通过微信登录，业务资料会同步保存。';
    } else if (profile && (profile.isMockOpenId || (session && session.qaOverride))) {
      modeText = '当前资料仅保存到本设备。';
    } else if (profile) {
      modeText = '当前账号状态待确认，请重新检查或联系管理员。';
    }

    const canCreateGroupOrder = canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE);
    const canViewGroupOrders = canUseFeature(profile, FEATURE_KEYS.GROUP_ORDERS);
    const canViewProducts = canUseFeature(profile, FEATURE_KEYS.PRODUCTS);
    const canViewCustomerOrders = canUseFeature(profile, FEATURE_KEYS.CUSTOMER_ORDERS);
    const canViewDataCenter = canUseFeature(profile, FEATURE_KEYS.DATA_CENTER);
    const roles = profile && Array.isArray(profile.roles) ? profile.roles : [];
    const canApplyProvider = canUseBusiness && !roles.includes('provider');
    const canViewOperationLogs = canUseFeature(profile, FEATURE_KEYS.OPERATION_LOGS);

    this.setData({
      modeText,
      accessState,
      accessStateText: AuthService.getAccessStateText(profile),
      authReady: true,
      isAccessLoading: false,
      canUseBusiness,
      canCreateGroupOrder,
      canViewGroupOrders,
      canViewProducts,
      canViewCustomerOrders,
      canViewDataCenter,
      canApplyProvider,
      canViewOperationLogs,
    });
    if (canUseBusiness) {
      this.loadSummary();
    }
  },

  async loadSummary() {
    this.setData({ isSummaryLoading: true });
    const [groupOrderRes, customerOrderRes] = await Promise.all([
      GroupOrderService.listVisible(),
      CustomerOrderService.listVisible(),
    ]);
    if (!groupOrderRes.success || !customerOrderRes.success) {
      this.setData({
        isSummaryLoading: false,
        summaryCards: [
          { label: '进行中团单', value: 0, target: 'groupOrders' },
          { label: '待确认收款', value: 0, target: 'pendingPayments' },
          { label: '客户订单', value: 0, target: 'customerOrders' },
        ],
      });
      return;
    }
    const groupOrders = groupOrderRes.data || [];
    const customerOrders = this.mergeCustomerOrders(customerOrderRes.data || [], groupOrders);
    this.setData({
      isSummaryLoading: false,
      summaryCards: [
        { label: '进行中团单', value: groupOrders.filter(item => Number(item.status) === 1).length, target: 'groupOrders' },
        { label: '待确认收款', value: customerOrders.filter(item => Number(item.status) === 1).length, target: 'pendingPayments' },
        { label: '客户订单', value: customerOrders.length, target: 'customerOrders' },
      ],
    });
  },

  mergeCustomerOrders(customerOrders = [], groupOrders = []) {
    const map = new Map();
    customerOrders.forEach((order) => {
      const key = String(order.id || `${order.groupOrderId}-${order.customerName}-${order.totalPrice}`);
      map.set(key, order);
    });
    groupOrders.forEach((groupOrder) => {
      (groupOrder.memberOrderList || []).forEach((order, index) => {
        const key = String(order.id || `${groupOrder.id}-${index}-${order.customerName || ''}`);
        if (!map.has(key)) {
          map.set(key, {
            ...order,
            id: key,
            groupOrderId: groupOrder.id,
            groupOrderTitle: groupOrder.title,
          });
        }
      });
    });
    return Array.from(map.values());
  },

  goLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/home/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  async refreshAccessState() {
    await AuthService.refreshSession();
    this.refreshModeText();
    wx.showToast({ title: '状态已刷新', icon: 'none' });
  },

  goGroupOrders() {
    if (!canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.GROUP_ORDERS)) {
      this.goLogin();
      return;
    }
    this.openUrl('/pages/groupOrder/index');
  },

  goProducts() {
    if (!canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.PRODUCTS)) {
      this.goLogin();
      return;
    }
    this.openUrl('/pages/productManagement/index');
  },

  goCustomerOrders() {
    if (!canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.CUSTOMER_ORDERS)) {
      this.goLogin();
      return;
    }
    this.openUrl('/pages/customerOrders/index');
  },

  goSummaryCard(e) {
    const { target } = e.currentTarget.dataset;
    if (target === 'groupOrders') {
      this.goGroupOrders();
      return;
    }
    if (target === 'pendingPayments') {
      navigateByUrl('/pages/customerOrders/index?status=1');
      return;
    }
    if (target === 'customerOrders') {
      this.goCustomerOrders();
    }
  },

  goRelease() {
    if (!this.data.canCreateGroupOrder) {
      wx.showToast({ title: '当前账号不能新建团单', icon: 'none' });
      return;
    }
    navigateByUrl('/pages/release/index', {
      fail: () => wx.showToast({ title: '打开开团入口失败', icon: 'none' }),
    });
  },

  goDataCenter() {
    if (!this.data.canViewDataCenter) {
      wx.showToast({ title: '当前账号不能查看数据看板', icon: 'none' });
      return;
    }
    this.openUrl('/pages/dataCenter/index');
  },

  goProviderApply() {
    this.openUrl('/pages/providers/edit/index?apply=1');
  },

  goOperationLogs() {
    if (!this.data.canViewOperationLogs) {
      wx.showToast({ title: '当前账号不能查看操作记录', icon: 'none' });
      return;
    }
    this.openUrl('/pages/operationLogs/index');
  },

  goMy() {
    this.openUrl('/pages/my/index');
  },

  openUrl(url) {
    const path = String(url || '').split('?')[0];
    const fail = () => wx.showToast({ title: '打开页面失败', icon: 'none' });
    if (TAB_URLS.has(path)) {
      wx.switchTab({ url: path, fail });
      return;
    }
    wx.navigateTo({ url, fail });
  },
});
