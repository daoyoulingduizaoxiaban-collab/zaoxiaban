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
    wx.redirectTo({
      url: `/pages/login/login${suffix}`,
      fail: () => {
        wx.navigateTo({ url: `/pages/login/login${suffix}` });
      },
    });
  },
});
