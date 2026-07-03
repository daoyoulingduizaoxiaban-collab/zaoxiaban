import { AuthService } from '~/services/auth/authService';
import { isOwnerOrAdmin } from '~/services/auth/roleScope';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';

Page({
  data: {
    titleText: '工作台',
    modeText: '请先登录；正式登录后资料保存到微信云端。',
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
    let modeText = '请先登录；正式登录后资料保存到微信云端。';

    if (profile && cloudEnabled && session && session.cloudOpenIdVerified) {
      modeText = '当前账号已通过微信登录，业务资料保存到微信云端。';
    } else if (profile && (profile.isMockOpenId || (session && session.qaOverride))) {
      modeText = '当前未连接微信云端保存。';
    } else if (profile) {
      modeText = '当前账号未通过云端验证。';
    }

    const canCreateGroupOrder = Boolean(profile && (profile.role === 'guide' || isOwnerOrAdmin(profile)));
    const canViewDataCenter = Boolean(profile && ['guide', 'customer', 'owner', 'admin'].includes(profile.role));

    this.setData({ modeText, canCreateGroupOrder, canViewDataCenter });
  },

  goGroupOrders() {
    wx.switchTab({ url: '/pages/groupOrder/index' });
  },

  goProducts() {
    wx.switchTab({ url: '/pages/productManagement/index' });
  },

  goCustomerOrders() {
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
