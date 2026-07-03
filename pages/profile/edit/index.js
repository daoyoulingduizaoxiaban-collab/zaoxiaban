Page({
  data: {
    pageTitle: '新增个人资料',
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
        pageTitle: '编辑个人资料',
        isEdit: true
      });
      this.fetchprofileDetail(options.id);
    }
  },

  fetchprofileDetail(id) {
    this.setData({
      'formData.title': '林秝帆',
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
