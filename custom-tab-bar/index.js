import {
  BOTTOM_BAR_LIST
} from '../config'
import { AuthService } from '../services/auth/authService';

Component({
  data: {
    value: '',
    unreadNum: 0,
    list: [],
  },
  lifetimes: {
    attached() {
      this.refreshTabBar();
    },
    ready() {
      this.refreshTabBar();
    }
  },
  pageLifetimes: {
    show() {
      this.refreshTabBar();
    },
  },
  methods: {
    getVisibleTabs() {
      return AuthService.canUseBusiness()
        ? BOTTOM_BAR_LIST
        : BOTTOM_BAR_LIST.filter(item => item.value === 'my');
    },

    getCurrentTabValue() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      const match = curPage && curPage.route ? curPage.route.match(/pages\/([^/]+)/) : null;
      return match && match[1] ? match[1] : 'my';
    },

    refreshTabBar() {
      this.setData({
        list: this.getVisibleTabs(),
        value: this.getCurrentTabValue(),
      });
    },

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
        const nextList = this.getVisibleTabs();
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

    initTabBar() {
      this.refreshTabBar();
    },
  },
});
