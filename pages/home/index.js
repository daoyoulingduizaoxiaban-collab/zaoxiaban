Page({
  data: {
    titleText: '工作台',
    modeText: '正式微信云端已接通；mock 身份会使用本地/QA fallback。',
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
