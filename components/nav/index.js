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
      value: '' // 預設值
    }
  },
  data: {
    visible: false,
    sidebar: [{
        title: '团单',
        url: 'pages/groupOrder/index',
        isSidebar: true,
      },
      {
        title: '搜索页',
        url: 'pages/search/index',
        isSidebar: false,
      },
      // {
      //   title: '发布页',
      //   url: 'pages/release/index',
      //   isSidebar: false,
      // },
      // {
      //   title: '消息列表页',
      //   url: 'pages/message/index',
      //   isSidebar: true,
      // },
      // {
      //   title: '对话页',
      //   url: 'pages/chat/index',
      //   isSidebar: false,
      // },
      // {
      //   title: '个人中心页',
      //   url: 'pages/my/index',
      //   isSidebar: true,
      // },
      // {
      //   title: '个人信息表单页',
      //   url: 'pages/my/info-edit/index',
      //   isSidebar: false,
      // },
      // {
      //   title: '设置页',
      //   url: 'pages/setting/index',
      //   isSidebar: false,
      // },
      // {
      //   title: '数据图表页',
      //   url: 'pages/dataCenter/index',
      //   isSidebar: false,
      // },
      // {
      //   title: '登录注册页',
      //   url: 'pages/login/login',
      //   isSidebar: false,
      // },
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
