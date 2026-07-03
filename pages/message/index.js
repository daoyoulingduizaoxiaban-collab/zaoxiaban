Page({
  data: {},

  onLoad() {
    wx.showToast({ title: '请先通过客户订单处理沟通事项', icon: 'none' });
  },

  goCustomerOrders() {
    wx.switchTab({ url: '/pages/customerOrders/index' });
  },
});
