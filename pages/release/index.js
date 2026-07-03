import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';

Page({
  data: {
    canCreateGroupOrder: false,
    accessText: '请先登录后继续使用',
  },

  onShow() {
    const profile = AuthService.getCurrentProfile();
    this.setData({
      canCreateGroupOrder: canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE),
      accessText: getRoleScopeText(profile, FEATURE_KEYS.GROUP_ORDER_CREATE),
    });
  },

  goCreateGroupOrder() {
    if (!this.data.canCreateGroupOrder) {
      if (!AuthService.getCurrentProfile()) {
        navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/release/index')}`, {
          fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
        });
        return;
      }
      wx.showToast({ title: this.data.accessText, icon: 'none' });
      return;
    }
    navigateByUrl('/sub-pages/groupOrder/add/index', {
      fail: () => {
        wx.showToast({ title: '打开开团表单失败', icon: 'none' });
      },
    });
  },
});
