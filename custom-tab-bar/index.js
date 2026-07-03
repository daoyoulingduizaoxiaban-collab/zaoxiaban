import {
  BOTTOM_BAR_LIST
} from '../config'
import { AuthService } from '../services/auth/authService';

Component({
  data: {
    value: '', // 初始值设置为空，避免第一次加载时闪烁
    unreadNum: 0, // 未读消息数量
    list: [],
  },
  lifetimes: {
    attached() {
      this.setData({
        list: AuthService.canUseBusiness() ? BOTTOM_BAR_LIST : BOTTOM_BAR_LIST.filter(item => item.value === 'my')
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
        const nextList = AuthService.canUseBusiness() ? BOTTOM_BAR_LIST : BOTTOM_BAR_LIST.filter(item => item.value === 'my');
        if (nextList.length !== this.data.list.length) {
          this.setData({ list: nextList });
        }
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

    initTabBar() {
      this.setData({ list: BOTTOM_BAR_LIST });
    },
  },
});
