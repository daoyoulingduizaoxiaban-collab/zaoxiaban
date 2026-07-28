import { AuthService } from '~/services/auth/authService';
import { normalizeRouteUrl, redirectByUrl } from '~/utils/navigation';
import { isLocalIdentityEnabled, getLocalIdentityLabel, setLocalIdentity } from '~/services/auth/localIdentity';
import { DirectoryRepository } from '~/repositories/directoryRepository';

Page({
  data: {
    isSubmitting: false,
    authNotice: '登录后即可浏览团单、下单与查看订单。想开团管理，可在「我的」申请成为团主。',
    redirectTo: '/pages/my/index',
    // gate=1（未登录被 reLaunch 进来）：隐藏返回，作为唯一入口，只有登录一步。
    isGate: false,
    // 显示名称：微信已停用自动取昵称，只能用 type=nickname 让用户点一次填；登录时一并存进 displayName。
    nickname: '',
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
      isGate: String(options.gate || '') === '1',
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: (e.detail && e.detail.value) || '' });
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

      // 微信无法自动取昵称 → 首次登录强制填显示名称（#F5 决策），保证人人有名、永不显示「微信用户」。
      const nickname = String(this.data.nickname || '').trim();
      const hasRealName = profile.displayName && profile.displayName !== '微信用户';
      if (!hasRealName && !nickname) {
        wx.showToast({ title: '首次登录请先填写显示名称', icon: 'none' });
        return; // 停在登录页强制填名（finally 会复位提交态）
      }
      if (nickname && nickname !== profile.displayName) {
        const saved = await DirectoryRepository.saveUser({ id: profile.id, name: nickname, displayName: nickname });
        if (saved && saved.success && saved.data) {
          AuthService.updateCurrentProfile(saved.data);
          getApp().globalData.userInfo = saved.data;
          this.navigateAfterLogin();
          return;
        }
      }
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
