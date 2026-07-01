import { QaSeedMock } from '~/mock/qaSeed';

Page({
  data: {
    titleText: '客户订单',
    customerOrdersList: []
  },

  onLoad() {
    this.loadQaOrders();
  },

  loadQaOrders() {
    this.setData({
      customerOrdersList: QaSeedMock.getCustomerOrders()
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const normalizedId = String(id);
    const item = this.data.customerOrdersList.find(order => String(order.id) === normalizedId);
    wx.showModal({
      title: item ? item.title : '客户订单',
      content: item ? `状态：${item.statusText}\n客户：${item.customerName}\n金额：￥${item.totalPrice}\nQA 展示模式，详情页暂未开发。` : '未找到订单资料。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'customerOrders'
      });
    }
  },

  onGoToEdit(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    const url = id ? `/pages/customerOrders/edit/index?id=${id}` : '/pages/customerOrders/edit/index';

    wx.navigateTo({
      url: url,
      fail: (err) => {
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({ url });
        } else {
          wx.showToast({ title: '打开订单表单失败', icon: 'none' });
        }
      }
    });
  }
});
