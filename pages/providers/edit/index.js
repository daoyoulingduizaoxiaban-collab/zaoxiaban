Page({
  data: {
    pageTitle: '新增供應',
    isEdit: false,
    formData: {
      title: '',
      date: '',
      statusText: '進行中'
    }
  },

  onLoad(options) {
    if (options.id) {
      // 編輯模式
      this.setData({
        pageTitle: '編輯供應',
        isEdit: true
      });
      this.fetchprovidersDetail(options.id);
    }
  },

  fetchprovidersDetail(id) {
    // 模擬從資料庫讀取資料
    console.log('正在讀取供應 ID:', id);
    this.setData({
      'formData.title': '東京五日遊 (已讀取)',
      'formData.date': '2026-01-07'
    });
  },

  onSave() {
    const action = this.data.isEdit ? '更新' : '創建';
    wx.showToast({ title: `${action}成功`, icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1500);
  },

  onBack() {
    wx.navigateBack();
  }
});