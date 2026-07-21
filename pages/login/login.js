import { AuthService } from '~/services/auth/authService';
import { normalizeRouteUrl, redirectByUrl } from '~/utils/navigation';

Page({
  data: {
    isSubmitting: false,
    authNotice: '登录后即可浏览团单、下单与查看订单。想开团管理，可在「我的」申请成为团主。',
    redirectTo: '/pages/my/index',
  },

  onLoad(options = {}) {
    this.setData({
      redirectTo: normalizeRouteUrl(options.redirectTo),
    });
  },

  async login() {
    if (this.data.isSubmitting) return;

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '登录中...' });

    try {
      const res = await AuthService.login();
      if (!res.success) {
        wx.showToast({
          title: res.error || '登录失败，请稍后重试',
          icon: 'none',
        });
        return;
      }
      const { profile } = res.data;
      const title = AuthService.canUseBusiness(profile) ? `登录成功：${profile.roleLabel}` : AuthService.getAccessStateText(profile);

      wx.showToast({
        title,
        icon: 'none',
      });

      getApp().globalData.userInfo = profile;
      this.navigateAfterLogin();
    } catch (err) {
      wx.showToast({
        title: '登录失败，请稍后重试',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
    }
  },

  navigateAfterLogin() {
    redirectByUrl(this.data.redirectTo, { fallbackUrl: '/pages/my/index' });
  },
});
