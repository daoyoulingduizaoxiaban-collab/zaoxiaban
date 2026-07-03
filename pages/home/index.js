import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';

Page({
  data: {
    titleText: '工作台',
    modeText: '请先登录；通过审核后即可使用业务功能。',
    accessState: 'logged_out',
    accessStateText: '请先登录后继续使用',
    canUseBusiness: false,
    canCreateGroupOrder: false,
    canViewDataCenter: false,
  },

  onLoad() {
    this.refreshModeText();
  },

  onShow() {
    this.refreshModeText();
  },

  refreshModeText() {
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
    const canViewDataCenter = canUseFeature(profile, FEATURE_KEYS.DATA_CENTER);

    this.setData({
      modeText,
      accessState,
      accessStateText: AuthService.getAccessStateText(profile),
      canUseBusiness,
      canCreateGroupOrder,
      canViewDataCenter,
    });
  },

  goLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
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
    wx.switchTab({ url: '/pages/groupOrder/index' });
  },

  goProducts() {
    if (!canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.PRODUCTS)) {
      this.goLogin();
      return;
    }
    wx.switchTab({ url: '/pages/productManagement/index' });
  },

  goCustomerOrders() {
    if (!canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.CUSTOMER_ORDERS)) {
      this.goLogin();
      return;
    }
    wx.switchTab({ url: '/pages/customerOrders/index' });
  },

  goRelease() {
    if (!this.data.canCreateGroupOrder) {
      wx.showToast({ title: '当前账号不能新建团单', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/release/index',
      fail: () => wx.showToast({ title: '打开开团入口失败', icon: 'none' }),
    });
  },

  goDataCenter() {
    if (!this.data.canViewDataCenter) {
      wx.showToast({ title: '当前账号不能查看数据看板', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/dataCenter/index',
      fail: () => wx.showToast({ title: '打开数据看板失败', icon: 'none' }),
    });
  },
});
