import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import {
  getGroupOrderStatusList,
  getGroupOrderStatusTextByValue
} from '~/enum/GroupOrderStatus'
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText, canManageGroupOrder } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';
import { useAccessPage } from '~/behaviors/useAccessPage';

Page({
  // access-state + 三态字段与 helper（buildAccessState/loadingState/threeState）来自 behavior（R1）
  behaviors: [useAccessPage],

  data: {
    titleText: '团单',
    itineraryList: [],
    searchKeyword: '',
    statusOptions: getGroupOrderStatusList(),
    currentStatus: 0,
    canCreateGroupOrder: false,
    // 覆写 behavior 的空态默认文案
    emptyText: '暂无团单',
    isNavigatingCreate: false,
  },

  // 开团入口全站只留右下 FAB（#4 已定）：空态 CTA 不再放「新建团单」，避免双新增按钮。
  computeEmptyCta() {
    if (!AuthService.getCurrentProfile()) return '去登录';
    return '';
  },

  onGroupEmptyCta() {
    this.onLogin();
  },

  async onLoad() {
    (this as any)._skipNextShowRefresh = true;
    await this.refreshAndFetchItineraryList();
  },

  async refreshAndFetchItineraryList() {
    if ((this as any)._refreshInFlight) return (this as any)._refreshInFlight;
    (this as any)._refreshInFlight = (async () => {
      await AuthService.refreshSession();
      await this.fetchItineraryList();
    })();
    try {
      return await (this as any)._refreshInFlight;
    } finally {
      (this as any)._refreshInFlight = null;
    }
  },

  normalizeGroupOrders(list) {
    const profile = AuthService.getCurrentProfile();
    return list.map(item => ({
      ...item,
      statusText: getGroupOrderStatusTextByValue(item.status),
      // 团主/管理层卡显示人数+金额；客户卡因隐私不显（A6）
      canManage: canManageGroupOrder(item, profile),
    }));
  },

  // 单一取数路径（合并原 fetchItineraryList 无筛选 与 applyFilters 带筛选）：
  // 读 this.data 的 searchKeyword/currentStatus，用 listVisibleWithStats 带回人数/已收/应收。
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
        ...(this as any).threeState('empty'),
      });
      return;
    }

    this.setData((this as any).loadingState());

    const { searchKeyword, currentStatus } = this.data;
    const isFiltered = Boolean(searchKeyword) || Number(currentStatus) > 0;

    try {
      const res = await GroupOrderService.listVisibleWithStats({
        keyword: searchKeyword,
        status: currentStatus,
      });
      if (res.success) {

        const list = this.normalizeGroupOrders(res.data);

        this.setData({
          itineraryList: list,
          canCreateGroupOrder: this.canCreateGroupOrder(),
          ...(this as any).buildAccessState(FEATURE_KEYS.GROUP_ORDERS),
          canUseBusiness: true,
          roleScopeText: getRoleScopeText(profile, FEATURE_KEYS.GROUP_ORDERS),
          ...(this as any).threeState(list.length ? 'ready' : 'empty', {
            emptyText: isFiltered
              ? '没有符合条件的团单'
              : (this.canCreateGroupOrder() ? '暂无团单，点右下角 + 新建' : '暂无团单'),
            emptyCta: this.computeEmptyCta(),
          }),
        });
      } else {
        const errorText = res.error || '加载团单失败';
        this.setData({
          itineraryList: [],
          canCreateGroupOrder: this.canCreateGroupOrder(),
          ...(this as any).buildAccessState(FEATURE_KEYS.GROUP_ORDERS),
          canUseBusiness: true,
          roleScopeText: errorText,
          ...(this as any).threeState('error', { errorText }),
        });
        wx.showToast({
          title: errorText,
          icon: 'none'
        });
      }
    } catch (err) {
      this.setData({
        itineraryList: [],
        canCreateGroupOrder: this.canCreateGroupOrder(),
        ...(this as any).buildAccessState(FEATURE_KEYS.GROUP_ORDERS),
        canUseBusiness: true,
        roleScopeText: '加载团单失败',
        ...(this as any).threeState('error', { errorText: '加载团单失败' }),
      });
      wx.showToast({
        title: '加载团单失败',
        icon: 'none'
      });
    }
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
    if ((this as any)._skipNextShowRefresh) {
      (this as any)._skipNextShowRefresh = false;
      this.setData({ isNavigatingCreate: false });
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().refreshTabBar();
      }
      return;
    }
    this.setData({
      ...(this as any).loadingState(),
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

    const url = `/sub-pages/groupOrder/add/index?from=${encodeURIComponent('/pages/groupOrder/index')}`;

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
    }, () => this.fetchItineraryList());
  },

  onStatusChange(e) {
    this.setData({
      currentStatus: e.detail.value
    }, () => this.fetchItineraryList());
  }

});
