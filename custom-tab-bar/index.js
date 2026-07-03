import {
  BOTTOM_BAR_LIST
} from '../config'

Component({
  data: {
    value: '', // 初始值设置为空，避免第一次加载时闪烁
    unreadNum: 0, // 未读消息数量
    list: [],
  },
  lifetimes: {
    attached() {
      this.setData({
        list: BOTTOM_BAR_LIST
      });
    },
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];

      if (curPage) {
        const match = curPage.route.match(/pages\/([^/]+)/);
        if (match && match[1]) {
          this.setData({
            value: match[1]
          });
        }
      }
      // const pages = getCurrentPages();
      // const curPage = pages[pages.length - 1];

      // if (curPage) {
      //   const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
      //   if (nameRe === null) return;
      //   if (nameRe[1] && nameRe) {
      //     this.setData({
      //       value: nameRe[1],
      //     });
      //   }
      // }

      // // 同步全局未读消息数量
      // this.setUnreadNum(app.globalData.unreadNum);
      // app.eventBus.on('unread-num-change', (unreadNum) => {
      //   this.setUnreadNum(unreadNum);
      // });
    }
    // attached() {
    //   this.initTabBar()
    // }
  },
  methods: {
    onChange(e) {
      const targetValue = e.detail;
      const item = this.data.list.find(i => i.value === targetValue);
      if (item) {
        wx.switchTab({
          url: item.path
        });
      }
    },
    handleChange(e) {
      try {
        const {
          value
        } = e.detail;
        const item = this.data.list.find(i => i.value === value);

        if (item) {
          const previousValue = this.data.value;
          this.setData({ value });
          wx.switchTab({
            url: item.path,
            fail: () => {
              this.setData({ value: previousValue });
              wx.showToast({
                title: '页面切换失败',
                icon: 'none'
              });
            }
          });
        }
      } catch (error) {
        wx.showToast({
          title: '页面切换失败',
          icon: 'none'
        });
      }
    },

    /** 设置未读消息数量 */
    // setUnreadNum(unreadNum) {
    //   this.setData({
    //     unreadNum
    //   });
    // },

    // 初始化下方BAR
    initTabBar() {
      const menu = [
        // {
        //   icon: 'home',
        //   value: 'home',
        //   label: '首頁'
        // },
        {
          icon: 'home',
          value: 'groupOrder',
          label: '团单'
        },
        {
          icon: 'home',
          value: 'tourGuides',
          label: '导游管理'
        },
        {
          icon: 'home',
          value: 'customerOrders',
          label: '客户订单'
        },
        {
          icon: 'home',
          value: 'providers',
          label: '供应商'
        },
        {
          icon: 'home',
          value: 'profile',
          label: '我的'
        },
      ];
      this.setData({
        list: menu
      });
    },
  },
});
