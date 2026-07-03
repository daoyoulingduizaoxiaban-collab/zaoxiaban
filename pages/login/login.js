import { AuthService } from '~/services/auth/authService';

Page({
  data: {
    isSubmitting: false,
    authNotice: '登录后会提交使用申请，管理员确认身份后开放对应功能。',
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
      const { profile, session } = res.data;
      const title = AuthService.canUseBusiness(profile) ? `登录成功：${profile.roleLabel}` : AuthService.getAccessStateText(profile);

      wx.showToast({
        title,
        icon: 'none',
      });

      wx.switchTab({
        url: '/pages/my/index',
        fail: () => {
          wx.showToast({ title: '打开我的页面失败', icon: 'none' });
        },
      });

      getApp().globalData.userInfo = profile;
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
});
