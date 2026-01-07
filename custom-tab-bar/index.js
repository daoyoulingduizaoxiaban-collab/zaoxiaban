const app = getApp();

Component({
  data: {
    value: '', // 初始值设置为空，避免第一次加载时闪烁
    unreadNum: 0, // 未读消息数量
    list: [],
  },
  lifetimes: {
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];

      if (curPage) {
        const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
        if (nameRe === null) return;
        if (nameRe[1] && nameRe) {
          this.setData({
            value: nameRe[1],
          });
        }
      }

      // // 同步全局未读消息数量
      // this.setUnreadNum(app.globalData.unreadNum);
      // app.eventBus.on('unread-num-change', (unreadNum) => {
      //   this.setUnreadNum(unreadNum);
      // });
    },
    attached() {
      this.initTabBar()
    }
  },
  methods: {
    handleChange(e) {
      const {
        value
      } = e.detail;
      wx.switchTab({
        url: `/pages/${value}/index`
      });
    },

    /** 设置未读消息数量 */
    setUnreadNum(unreadNum) {
      this.setData({
        unreadNum
      });
    },

    // 初始化下方BAR
    initTabBar() {
      // 模擬獲取角色（實際開發中可從 app.globalData 或 wx.getStorageSync 獲取）
      const userRole = wx.getStorageSync('role') || 'user';

      let menu = [{
          icon: 'home',
          value: 'home',
          label: '首頁'
        },
        {
          icon: 'home',
          value: 'schedule',
          label: '行程'
        },
        {
          icon: 'home',
          value: 'tourGuides',
          label: '導遊管理'
        },
        {
          icon: 'home',
          value: 'customerOrders',
          label: '客戶訂單'
        },
        {
          icon: 'home',
          value: 'providers',
          label: '供應管理'
        },
        {
          icon: 'home',
          value: 'profile',
          label: '我的'
        },
      ];

      //TODO 判斷權限
      // 

      this.setData({
        list: menu
      });
    },
  },
});