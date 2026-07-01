Page({
  data: {},

  goToWechatLogin() {
    wx.redirectTo({
      url: '/pages/login/login',
      fail: () => {
        wx.navigateTo({ url: '/pages/login/login' });
      },
    });
  },
});
