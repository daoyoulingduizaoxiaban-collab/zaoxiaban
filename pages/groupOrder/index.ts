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
    accessStateText: '',
  },

  // 初始化
  async onLoad() {
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
    if (!AuthService.canUseBusiness(profile)) {
      this.setData({
        itineraryList: [],
        roleScopeText: AuthService.getAccessStateText(profile),
        canCreateGroupOrder: false,
        isLoggedIn: Boolean(profile),
        canUseBusiness: false,
        accessStateText: AuthService.getAccessStateText(profile),
      });
      return;
    }

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
          accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
        });
      }
    } catch (err) {
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
    wx.navigateTo({
      url: '/pages/login/login',
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  // 点击团单跳转至详情页
  viewItinerary(e) {
    const {
      id
    } = e.currentTarget.dataset;
    wx.navigateTo({
      // 跳轉時攜帶 id，方便詳情頁請求對應數據
      url: `/sub-pages/groupOrder/detail/index?id=${id}&readonly=1`,
      fail: () => {
        wx.showToast({
          title: '跳轉詳情頁失敗',
          icon: 'none'
        });
      }
    });
  },

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'groupOrder'
      });
    }
    this.applyFilters();
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

    wx.navigateTo({
      url: url,
      fail: (err) => {
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({
            url
          });
        } else {
          wx.showToast({
            title: '打开新建团单失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 監聽搜尋框輸入
  onSearchChange(e) {
    this.setData({
      searchKeyword: e.detail.value
    }, () => this.applyFilters());
  },

  // 監聽狀態切換
  onStatusChange(e) {
    this.setData({
      currentStatus: e.detail.value
    }, () => this.applyFilters());
  },

  // 核心篩選邏輯
  async applyFilters() {
    if (!this.data.canUseBusiness) return;
    const {
      searchKeyword,
      currentStatus
    } = this.data;

    // 呼叫 Mock API，同時傳入兩個條件
    const res = await GroupOrderService.listVisible({
      keyword: searchKeyword,
      status: currentStatus
    });

    this.setData({
      // 確保畫面更新的是篩選後的結果
      itineraryList: this.normalizeGroupOrders(res.data)
    });
  }

});
