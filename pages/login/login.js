import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES } from '~/services/auth/roleScope';

Page({
  data: {
    roleOptions: AuthService.roleOptions,
    selectedRole: AUTH_ROLES.GUIDE,
    isSubmitting: false,
    authNotice: '登录后会提交使用申请，正式角色以管理员审核结果为准。管理角色由已授权账号进入。',
  },

  onRoleChange(e) {
    this.setData({
      selectedRole: e.detail.value,
    });
  },

  onRoleTap(e) {
    const { role } = e.currentTarget.dataset;
    if (!role) return;
    this.setData({ selectedRole: role });
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

  goLoginCode() {
    wx.navigateTo({
      url: '/pages/loginCode/loginCode',
      fail: () => wx.showToast({ title: '打开验证码登录失败', icon: 'none' }),
    });
  },
});
