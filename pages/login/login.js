import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES } from '~/services/auth/roleScope';

Page({
  data: {
    roleOptions: AuthService.roleOptions,
    selectedRole: AUTH_ROLES.GUIDE,
    isSubmitting: false,
    authNotice: '当前登录入口开放导游/领队与客户身份。管理角色由已授权账号进入。',
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
      const title = session.isMockOpenId ? '已进入演示身份' : `登录成功：${profile.roleLabel}`;

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
