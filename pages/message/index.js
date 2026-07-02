Page({
  data: {},

  onLoad() {
    wx.showToast({ title: '聊天能力暂未启用', icon: 'none' });
  },

  goCustomerOrders() {
    wx.switchTab({ url: '/pages/customerOrders/index' });
  },
});
