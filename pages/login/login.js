import { AuthService } from '~/services/auth/authService';
import { normalizeRouteUrl, redirectByUrl } from '~/utils/navigation';

Page({
  data: {
    isSubmitting: false,
    authNotice: '登录后会提交使用申请，管理员确认身份后开放对应功能。',
    redirectTo: '/pages/my/index',
    roleOptions: AuthService.roleOptions,
    selectedRole: AuthService.roleOptions[0] && AuthService.roleOptions[0].value,
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
      const res = await AuthService.login({ role: this.data.selectedRole });
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

  onRoleSelect(e) {
    const { role } = e.currentTarget.dataset;
    if (!role) return;
    this.setData({ selectedRole: role });
  },
});
