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
        // 如果是直接打開子頁面（無歷史記錄），則返回首頁
        wx.reLaunch({ url: '/pages/home/index' });
      }
    }
  }
});