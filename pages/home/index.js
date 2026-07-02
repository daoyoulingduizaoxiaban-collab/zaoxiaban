Page({
  data: {
    titleText: '工作台',
  },

  goGroupOrders() {
    wx.switchTab({ url: '/pages/groupOrder/index' });
  },

  goProducts() {
    wx.switchTab({ url: '/pages/productManagement/index' });
  },

  goCustomerOrders() {
    wx.switchTab({ url: '/pages/customerOrders/index' });
  },
});
