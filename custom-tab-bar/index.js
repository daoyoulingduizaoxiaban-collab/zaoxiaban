import config, {
  BOTTOM_BAR_LIST
} from '~/config';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';

const TAB_FEATURE_MAP = {
  groupOrder: FEATURE_KEYS.GROUP_ORDERS,
  customerOrders: FEATURE_KEYS.CUSTOMER_ORDERS,
  // 用户审核：仅 owner/admin 可见（FEATURE_ALLOWED_ROLES 已限定）
  userReview: FEATURE_KEYS.USER_REVIEW,
};

const TAB_ROUTE_VALUE_MAP = {
  'pages/groupOrder/index': 'groupOrder',
  'pages/customerOrders/index': 'customerOrders',
  'pages/userReview/index': 'userReview',
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
      // 纯客户（不具开团能力）：NAV 只留「我的订单 + 我的」——不显示团单 tab，
      // 客户订单 tab 改名「我的订单」（B2：客户经分享/扫码进团，不需要团单列表入口）。
      const isManager = canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE);
      const tabs = BOTTOM_BAR_LIST.filter((item) => {
        if (!isManager && item.value === 'groupOrder') return false;
        if (item.value === 'my') return true;
        const featureKey = TAB_FEATURE_MAP[item.value];
        return featureKey ? canUseFeature(profile, featureKey) : AuthService.canUseBusiness(profile);
      }).map(item => (
        !isManager && item.value === 'customerOrders' ? { ...item, label: '我的订单' } : item
      ));
      // 测试环境：所有角色可见「报Bug」入口（非 tab 页，点击走 navigateTo）。
      if (config.isDev) {
        tabs.push({ icon: 'help-circle', value: 'feedback', label: '报Bug', path: '/pages/feedback/index' });
      }
      return tabs;
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
        if (value === 'feedback') {
          // 报Bug 是普通页(非 tab)：navigateTo 打开，tab 高亮维持当前页，避免 switchTab 失败。
          this.setData({ value: this.getCurrentTabValue() });
          wx.navigateTo({
            url: '/pages/feedback/index',
            fail: () => wx.showToast({ title: '打开反馈页失败', icon: 'none' }),
          });
          return;
        }
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
