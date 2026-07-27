import { AuthService } from '~/services/auth/authService';
import { normalizeRouteUrl, redirectByUrl } from '~/utils/navigation';
import { isLocalIdentityEnabled, getLocalIdentityLabel, setLocalIdentity } from '~/services/auth/localIdentity';

Page({
  data: {
    isSubmitting: false,
    authNotice: '登录后即可浏览团单、下单与查看订单。想开团管理，可在「我的」申请成为团主。',
    redirectTo: '/pages/my/index',
    // 本地测试多人身份（仅 DEV+local 显示；留空＝owner，填名字/扫码带 ?tester= ＝独立账号）
    showLocalIdentity: false,
    localIdentity: '',
  },

  onLoad(options = {}) {
    // 扫码/跳转带 ?tester=xxx 时记为该测试身份
    if (options.tester) setLocalIdentity(options.tester);
    this.setData({
      redirectTo: normalizeRouteUrl(options.redirectTo),
      showLocalIdentity: isLocalIdentityEnabled(),
      localIdentity: getLocalIdentityLabel(),
    });
  },

  onLocalIdentityInput(e) {
    const value = (e.detail && e.detail.value) || '';
    setLocalIdentity(value);
    this.setData({ localIdentity: value });
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
