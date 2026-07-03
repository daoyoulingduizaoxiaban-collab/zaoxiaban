Component({
  properties: {
    title: {
      type: String,
      value: '页面'
    }
  },
  methods: {
    onBack() {
      const pages = getCurrentPages();

      if (pages.length > 1) {
        wx.navigateBack({ delta: 1 });
      } else {
        wx.switchTab({ url: '/pages/groupOrder/index' });
      }
    }
  }
});
