import { redirectByUrl } from '~/utils/navigation';

Page({
  data: {},

  onLoad(options = {}) {
    this.goToWechatLogin(options.redirectTo || '');
  },

  goToWechatLogin(redirectTo = '') {
    let decoded = '';
    try {
      decoded = decodeURIComponent(String(redirectTo || ''));
    } catch (err) {
      decoded = '';
    }
    const suffix = decoded ? `?redirectTo=${encodeURIComponent(decoded)}` : '';
    redirectByUrl(`/pages/login/login${suffix}`, {
      fallbackUrl: '/pages/my/index',
    });
  },
});
