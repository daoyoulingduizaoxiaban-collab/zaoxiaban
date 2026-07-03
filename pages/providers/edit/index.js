Page({
  data: {
    pageTitle: '新增供应商',
    isEdit: false,
    formData: {
      title: '',
      date: '',
      statusText: '可显示资料'
    }
  },

  onLoad(options) {
    if (options.id) {
      // 編輯模式
      this.setData({
        pageTitle: '编辑供应商',
        isEdit: true
      });
      this.fetchprovidersDetail(options.id);
    }
  },

  fetchprovidersDetail(id) {
    this.setData({
      'formData.title': '杭州伴手礼供应商',
      'formData.date': '2026-01-07'
    });
  },

  showDatePicker() {
    const today = new Date().toISOString().slice(0, 10);
    this.setData({ 'formData.date': today });
    wx.showToast({ title: '已填入今日维护日期', icon: 'none' });
  },

  onSave() {
    wx.showToast({ title: 'QA 展示模式，暂未保存', icon: 'none' });
  },

  onBack() {
    wx.navigateBack();
  }
});
