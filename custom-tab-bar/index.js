import {
  BOTTOM_BAR_LIST
} from '../config.js'
import { AuthService } from '../services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '../services/auth/roleScope';

const TAB_FEATURE_MAP = {
  groupOrder: FEATURE_KEYS.GROUP_ORDERS,
  customerOrders: FEATURE_KEYS.CUSTOMER_ORDERS,
  productManagement: FEATURE_KEYS.PRODUCTS,
};

const TAB_ROUTE_VALUE_MAP = {
  'pages/groupOrder/index': 'groupOrder',
  'pages/customerOrders/index': 'customerOrders',
  'pages/productManagement/index': 'productManagement',
  'pages/my/index': 'my',
};

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
      const profile = AuthService.getCurrentProfile();
      return BOTTOM_BAR_LIST.filter((item) => {
        if (item.value === 'my') return true;
        const featureKey = TAB_FEATURE_MAP[item.value];
        return featureKey ? canUseFeature(profile, featureKey) : AuthService.canUseBusiness(profile);
      });
    },

    getCurrentTabValue() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      const route = curPage && curPage.route ? String(curPage.route) : '';
      return TAB_ROUTE_VALUE_MAP[route] || 'my';
    },

    refreshTabBar() {
      const list = this.getVisibleTabs();
      const currentValue = this.getCurrentTabValue();
      const isCurrentVisible = list.some(item => item.value === currentValue);
      this.setData({
        list,
        value: isCurrentVisible ? currentValue : 'my',
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
        const item = nextList.find(i => i.value === value);

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
