import {
  BOTTOM_BAR_LIST
} from '~/config';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';

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

const getTabValueByRoute = (route = '') => {
  const normalizedRoute = String(route || '');
  if (TAB_ROUTE_VALUE_MAP[normalizedRoute]) return TAB_ROUTE_VALUE_MAP[normalizedRoute];
  if (normalizedRoute.indexOf('pages/my/') === 0) return 'my';
  return 'my';
};

const areTabListsEqual = (left = [], right = []) => (
  left.length === right.length
  && left.every((item, index) => {
    const next = right[index] || {};
    return item.value === next.value
      && item.path === next.path
      && item.label === next.label
      && item.text === next.text
      && item.icon === next.icon
      && item.selectedIcon === next.selectedIcon;
  })
);

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
      return getTabValueByRoute(curPage && curPage.route);
    },

    refreshTabBar() {
      const list = this.getVisibleTabs();
      const currentValue = this.getCurrentTabValue();
      const isCurrentVisible = list.some(item => item.value === currentValue);
      const value = isCurrentVisible ? currentValue : 'my';
      if (areTabListsEqual(this.data.list, list) && this.data.value === value) return;
      this.setData({ list, value });
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
        const { value } = e.detail;
        // 防循环：程序化 setData({value}) 会让 t-tab-bar 回吐 change；
        // 若目标就是当前页，不再 switchTab（否则 switchTab 跳自己 → show → 又 change → 死循环）。
        if (!value || value === this.getCurrentTabValue()) return;
        const nextList = this.getVisibleTabs();
        if (!areTabListsEqual(this.data.list, nextList)) {
          this.setData({ list: nextList });
        }
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
