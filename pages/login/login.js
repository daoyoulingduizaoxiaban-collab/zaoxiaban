import { AuthService } from '~/services/auth/authService';

const TAB_PAGE_URLS = new Set([
  '/pages/groupOrder/index',
  '/pages/customerOrders/index',
  '/pages/productManagement/index',
  '/pages/my/index',
]);

const normalizeRedirect = value => {
  let decoded = '';
  try {
    decoded = decodeURIComponent(String(value || '')).trim();
  } catch (err) {
    decoded = '';
  }
  if (!decoded || decoded.indexOf('/') !== 0 || decoded.indexOf('//') === 0) return '/pages/my/index';
  if (decoded.includes('..')) return '/pages/my/index';
  return decoded;
};

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
      redirectTo: normalizeRedirect(options.redirectTo),
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
    const redirectTo = normalizeRedirect(this.data.redirectTo);
    if (TAB_PAGE_URLS.has(redirectTo)) {
      wx.switchTab({
        url: redirectTo,
        fail: () => wx.switchTab({ url: '/pages/my/index' }),
      });
      return;
    }
    wx.redirectTo({
      url: redirectTo,
      fail: () => wx.switchTab({ url: '/pages/my/index' }),
    });
  },

  onRoleSelect(e) {
    const { role } = e.currentTarget.dataset;
    if (!role) return;
    this.setData({ selectedRole: role });
  },
});
