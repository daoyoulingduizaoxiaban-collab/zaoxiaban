import { AuthService } from '~/services/auth/authService';
import { normalizeRouteUrl, redirectByUrl } from '~/utils/navigation';
import { isLocalIdentityEnabled, getLocalIdentityLabel, setLocalIdentity } from '~/services/auth/localIdentity';
import { resetLocalBackendData } from '~/services/backend/backendCall';
import { DirectoryRepository } from '~/repositories/directoryRepository';

Page({
  data: {
    isSubmitting: false,
    authNotice: '登录后即可浏览团单、下单与查看订单。想开团管理，可在「我的」申请成为团主。',
    redirectTo: '/pages/my/index',
    // gate=1（未登录被 reLaunch 进来）：隐藏返回，作为唯一入口，只有登录一步。
    isGate: false,
    // 登录后才判断：仅「新用户（无名字）」才进入填名字这步，老用户直接进，看不到名字栏。
    needName: false,
    pendingUserId: '',
    // 显示名称：微信已停用自动取昵称，只能用 type=nickname 让新用户点一次填。
    nickname: '',
    // 本地测试多人身份（仅 DEV+local 显示；留空＝owner，填名字/扫码带 ?tester= ＝独立账号）
    showLocalIdentity: false,
    localIdentity: '',
    // 清空本地测试资料（决策 3）：与「测试身份」同一个门——开发者工具＋本地后端才出现。
    isResettingLocalData: false,
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

  // 清空本地测试资料库：把 local-server 那个（放在专案目录外的）JSON 库清空，
  // 并顺手登出——账号纪录都没了，留着旧的登录态只会看到一堆读不到的资料。
  onResetLocalData() {
    if (this.data.isResettingLocalData) return;
    wx.showModal({
      title: '清空本地测试资料',
      content: '会把本地测试资料库整个清空（团单、订单、商品、账号全没），并登出目前身份。云端资料不受影响。确定吗？',
      confirmText: '清空',
      confirmColor: '#e34d59',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        this.setData({ isResettingLocalData: true });
        wx.showLoading({ title: '清空中...' });
        try {
          const res = await resetLocalBackendData();
          if (!res.success) {
            wx.showToast({ title: res.error || '清空失败', icon: 'none' });
            return;
          }
          AuthService.logout();
          this.setData({ needName: false, pendingUserId: '', nickname: '' });
          wx.showToast({ title: '已清空，请重新登录', icon: 'none' });
        } finally {
          wx.hideLoading();
          this.setData({ isResettingLocalData: false });
        }
      },
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

      // 老用户已有名字 → 直接进；只有新用户（无名字）才进入下一步填名字（#F5：保证人人有名）。
      const hasRealName = profile.displayName && profile.displayName !== '微信用户';
      if (hasRealName) {
        getApp().globalData.userInfo = profile;
        this.navigateAfterLogin();
        return;
      }
      this.setData({ needName: true, pendingUserId: profile.id });
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

  // 新用户填完显示名称后才保存并进入（老用户走不到这步）。
  async confirmName() {
    if (this.data.isSubmitting) return;
    const nickname = String(this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请先填写显示名称', icon: 'none' });
      return;
    }
    const userId = this.data.pendingUserId;
    if (!userId) {
      wx.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' });
      this.setData({ needName: false });
      return;
    }
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '保存中...' });
    try {
      const saved = await DirectoryRepository.saveUser({ id: userId, name: nickname, displayName: nickname });
      if (saved && saved.success && saved.data) {
        AuthService.updateCurrentProfile(saved.data);
        getApp().globalData.userInfo = saved.data;
        this.navigateAfterLogin();
      } else {
        wx.showToast({ title: (saved && saved.error) || '保存失败，请重试', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
    }
  },

  navigateAfterLogin() {
    redirectByUrl(this.data.redirectTo, { fallbackUrl: '/pages/my/index' });
  },
});
