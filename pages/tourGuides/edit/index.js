Page({
  data: {
    pageTitle: '新增导游/领队',
    isEdit: false,
    formData: {
      title: '',
      date: '',
      statusText: 'QA 展示资料'
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        pageTitle: '编辑导游/领队',
        isEdit: true
      });
      this.fetchtourGuidesDetail(options.id);
    }
  },

  fetchtourGuidesDetail(id) {
    this.setData({
      'formData.title': '张领队',
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
