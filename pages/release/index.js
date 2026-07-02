Page({
  data: {},

  goCreateGroupOrder() {
    wx.navigateTo({
      url: '/sub-pages/groupOrder/add/index',
      fail: () => {
        wx.showToast({ title: '打开开团表单失败', icon: 'none' });
      },
    });
  },
});
