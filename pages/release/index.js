import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';

Page({
  data: {
    canCreateGroupOrder: false,
  },

  onShow() {
    const profile = AuthService.getCurrentProfile();
    this.setData({
      canCreateGroupOrder: canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE),
    });
  },

  goCreateGroupOrder() {
    if (!this.data.canCreateGroupOrder) {
      wx.showToast({ title: '当前账号不能新建团单', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/sub-pages/groupOrder/add/index',
      fail: () => {
        wx.showToast({ title: '打开开团表单失败', icon: 'none' });
      },
    });
  },
});
