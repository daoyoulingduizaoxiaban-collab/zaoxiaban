import {
  BOTTOM_BAR_LIST
} from '../config'

const app = getApp();

Component({
  data: {
    value: '', // 初始值设置为空，避免第一次加载时闪烁
    unreadNum: 0, // 未读消息数量
    list: [],
  },
  lifetimes: {
    attached() {
      // TODO 依據權限控制選項
      const userRole = wx.getStorageSync('role') || 'user';
      this.setData({
        list: BOTTOM_BAR_LIST
      });
    },
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];

      if (curPage) {
        // 優化後的正則：直接匹配 /pages/之後的第一個單字
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
          wx.switchTab({
            url: item.path
          });
        }
      } catch (error) {
        wx.showToast({
          title: '頁面切換失敗',
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
      // 模擬獲取角色（實際開發中可從 app.globalData 或 wx.getStorageSync 獲取）
      const userRole = wx.getStorageSync('role') || 'user';

      // TODO 依照權限控制下方BAR項目
      const menu = [
        // {
        //   icon: 'home',
        //   value: 'home',
        //   label: '首頁'
        // },
        {
          icon: 'home',
          value: 'groupOrder',
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

      // TODO 判斷權限

      this.setData({
        list: menu
      });
    },
  },
});
