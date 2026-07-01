import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES } from '~/services/auth/roleScope';

Page({
  data: {
    roleOptions: AuthService.roleOptions,
    selectedRole: AUTH_ROLES.GUIDE,
    isSubmitting: false,
    authNotice: '将调用 wx.login；未配置云函数时会使用本地 auth adapter 验证角色范围。',
  },

  onRoleChange(e) {
    this.setData({
      selectedRole: e.detail.value,
    });
  },

  async login() {
    if (this.data.isSubmitting) return;

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '登录中...' });

    try {
      const res = await AuthService.login({ role: this.data.selectedRole });
      const { profile, session } = res.data;
      const title = session.isMockOpenId ? '已进入本地身份验证' : '登录成功';

      wx.showToast({
        title,
        icon: 'none',
      });

      wx.switchTab({
        url: '/pages/my/index',
        fail: () => {
          wx.navigateTo({ url: '/pages/my/index' });
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
