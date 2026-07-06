import {
  GroupOrder
} from '~/models/GroupOrder';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import {
  getGroupOrderStatusList,
  getGroupOrderStatusTextByValue
} from '~/enum/GroupOrderStatus'
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';

Page({
  data: {
    titleText: '团单',
    itineraryList: [],
    searchKeyword: '',
    statusOptions: getGroupOrderStatusList(),
    currentStatus: 0,
    roleScopeText: '',
    canCreateGroupOrder: false,
    isLoggedIn: false,
    canUseBusiness: false,
    authReady: false,
    accessStateText: '',
    isLoading: true,
    loadErrorText: '',
    isNavigatingCreate: false,
  },

  async onLoad() {
    await AuthService.refreshSession();
    await this.fetchItineraryList();
  },

  normalizeGroupOrders(list) {
    return list.map(item => ({
      ...item,
      statusText: getGroupOrderStatusTextByValue(item.status)
    }));
  },

  async fetchItineraryList() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.GROUP_ORDERS)) {
      const accessText = getRoleScopeText(profile, FEATURE_KEYS.GROUP_ORDERS);
      this.setData({
        itineraryList: [],
        roleScopeText: accessText,
        canCreateGroupOrder: false,
        isLoggedIn: Boolean(profile),
        canUseBusiness: false,
        authReady: true,
        accessStateText: accessText,
        isLoading: false,
        loadErrorText: '',
      });
      return;
    }

    this.setData({ isLoading: true, loadErrorText: '' });
    wx.showLoading({
      title: '加载中'
    });

    try {
      const res = await GroupOrderService.listVisible();
      if (res.success) {

        const list = this.normalizeGroupOrders(res.data);

        this.setData({
          itineraryList: list,
          roleScopeText: this.getRoleScopeText(),
          canCreateGroupOrder: this.canCreateGroupOrder(),
          isLoggedIn: Boolean(AuthService.getCurrentProfile()),
          canUseBusiness: true,
          authReady: true,
          accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
          isLoading: false,
          loadErrorText: '',
        });
      } else {
        const errorText = res.error || '加载团单失败';
        this.setData({
          itineraryList: [],
          roleScopeText: errorText,
          canCreateGroupOrder: this.canCreateGroupOrder(),
          isLoggedIn: Boolean(AuthService.getCurrentProfile()),
          canUseBusiness: true,
          authReady: true,
          accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
          isLoading: false,
          loadErrorText: errorText,
        });
        wx.showToast({
          title: errorText,
          icon: 'none'
        });
      }
    } catch (err) {
      this.setData({
        itineraryList: [],
        roleScopeText: '加载团单失败',
        canCreateGroupOrder: this.canCreateGroupOrder(),
        isLoggedIn: Boolean(AuthService.getCurrentProfile()),
        canUseBusiness: true,
        authReady: true,
        accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
        isLoading: false,
        loadErrorText: '加载团单失败',
      });
      wx.showToast({
        title: '加载团单失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  getRoleScopeText() {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) return AuthService.getAccessStateText(profile);
    return getRoleScopeText(profile, FEATURE_KEYS.GROUP_ORDERS);
  },

  canCreateGroupOrder() {
    return canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.GROUP_ORDER_CREATE);
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/groupOrder/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  viewItinerary(e) {
    const {
      id
    } = e.currentTarget.dataset;
    navigateByUrl(`/sub-pages/groupOrder/detail/index?id=${id}&readonly=1`, {
      fail: () => {
        wx.showToast({
          title: '打开详情页失败',
          icon: 'none'
        });
      }
    });
  },

  async onShow() {
    this.setData({
      authReady: false,
      isLoading: true,
      loadErrorText: '',
      isNavigatingCreate: false,
    });
    await AuthService.refreshSession();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabBar();
    }
    await this.fetchItineraryList();
  },

  addItinerary(e) {
    if (!this.canCreateGroupOrder()) {
      wx.showToast({
        title: '当前角色不能新建团单',
        icon: 'none'
      });
      return;
    }

    const url = '/sub-pages/groupOrder/add/index';

    this.setData({ isNavigatingCreate: true });
    navigateByUrl(url, {
      fail: () => {
        this.setData({ isNavigatingCreate: false });
        wx.showToast({
          title: '打开新建团单失败',
          icon: 'none'
        });
      }
    });
  },

  onSearchChange(e) {
    this.setData({
      searchKeyword: e.detail.value
    }, () => this.applyFilters());
  },

  onStatusChange(e) {
    this.setData({
      currentStatus: e.detail.value
    }, () => this.applyFilters());
  },

  async applyFilters() {
    if (!this.data.canUseBusiness) return;
    const {
      searchKeyword,
      currentStatus
    } = this.data;

    const res = await GroupOrderService.listVisible({
      keyword: searchKeyword,
      status: currentStatus
    });

    if (!res.success) {
      const errorText = res.error || '加载团单失败';
      this.setData({
        itineraryList: [],
        roleScopeText: errorText,
        loadErrorText: errorText,
      });
      wx.showToast({
        title: errorText,
        icon: 'none'
      });
      return;
    }

    this.setData({
      itineraryList: this.normalizeGroupOrders(res.data),
      roleScopeText: this.getRoleScopeText(),
      loadErrorText: '',
    });
  }

});
