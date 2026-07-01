Page({
  data: {
    formData: {
      title: '',
      totalReceivable: 0,
      totalReceived: 0,
      totalCustomers: 0,
      description: '',
      statusText: '未付款'
    }
  },

  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    let value = e.detail.value;
    
    if (['totalReceivable', 'totalReceived', 'totalCustomers'].includes(field)) {
      value = value ? parseInt(value, 10) : 0;
    }

    this.setData({
      [`formData.${field}`]: value
    });
  },

  async onSave() {
    const { formData } = this.data;
    
    if (!formData.title) {
      wx.showToast({ title: '请输入团单名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '团单建立中...' });

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: 'QA 展示模式，暂未保存',
        icon: 'none',
        success: () => {
          setTimeout(() => wx.navigateBack(), 1000);
        }
      });
    }, 800);
  }
});
