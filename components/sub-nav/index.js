Component({
  properties: {
    title: {
      type: String,
      value: '頁面標題'
    }
  },
  methods: {
    onBack() {
      // 統一處理返回邏輯
      const pages = getCurrentPages();

      if (pages.length > 1) {
        wx.navigateBack({ delta: 1 });
      } else {
        wx.reLaunch({ url: '/pages/groupOrder/index' });
      }
    }
  }
});