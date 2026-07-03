Component({
  options: {
    styleIsolation: 'shared',
  },
  properties: {
    navType: {
      type: String,
      value: 'title',
    },
    titleText: {
      type: String,
      value: ''
    }
  },
  data: {
    visible: false,
    sidebar: [
      {
        title: '团单',
        url: 'pages/groupOrder/index',
        isSidebar: true,
      },
      {
        title: '搜索',
        url: 'pages/search/index',
        isSidebar: false,
      },
    ],
    statusHeight: 0,
  },
  lifetimes: {
    ready() {
      const statusHeight = wx.getWindowInfo().statusBarHeight;
      this.setData({
        statusHeight
      });
    },
  },
  methods: {
    openDrawer() {
      this.setData({
        visible: true,
      });
    },
    itemClick(e) {
      const that = this;
      const {
        isSidebar,
        url
      } = e.detail.item;
      if (isSidebar) {
        wx.switchTab({
          url: `/${url}`,
          success: () => that.setData({ visible: false }),
          fail: () => wx.switchTab({ url: '/pages/groupOrder/index' }),
        });
      } else {
        wx.navigateTo({
          url: `/${url}`,
          success: () => that.setData({ visible: false }),
          fail: () => {
            wx.showToast({ title: '暂时无法打开该页面', icon: 'none' });
          },
        });
      }
    },

    searchTurn() {
      wx.navigateTo({
        url: `/pages/search/index`,
      });
    },
  },
});
