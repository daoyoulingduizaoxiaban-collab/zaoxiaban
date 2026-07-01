Page({
  data: {
    pageTitle: '新增客户订单',
    isEdit: false,
    formData: {
      title: '',
      date: '',
      statusText: '未付款'
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        pageTitle: '编辑客户订单',
        isEdit: true
      });
      this.fetchcustomerOrdersDetail(options.id);
    }
  },

  fetchcustomerOrdersDetail(id) {
    this.setData({
      'formData.title': '华东五日团伴手礼收单',
      'formData.date': '2026-01-07'
    });
  },

  onSave() {
    wx.showToast({ title: 'QA 展示模式，暂未保存', icon: 'none' });
  },

  onBack() {
    wx.navigateBack();
  }
});
