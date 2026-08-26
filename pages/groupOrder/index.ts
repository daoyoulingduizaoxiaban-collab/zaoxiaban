import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import {
  getGroupOrderStatusList,
  getGroupOrderStatusTextByValue
} from '~/enum/GroupOrderStatus'
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText, canManageGroupOrder } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';
import { useAccessPage } from '~/behaviors/useAccessPage';
import { callBusinessData } from '~/repositories/cloudBusinessRepository';
import { RESULT_TEXT, toastSuccess, toastError } from '~/utils/feedback';

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
    }))
      // 按建立时间新→旧排序
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  },

  // 复制团单：跳到「开团」页并带入源团单内容（含商品价格档与图片），确认后才建立新团单。
  onCopyItinerary(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    this.setData({ isNavigatingCreate: true });
    navigateByUrl(`/sub-pages/groupOrder/add/index?copyFrom=${encodeURIComponent(String(id))}&from=${encodeURIComponent('/pages/groupOrder/index')}`, {
      fail: () => {
        this.setData({ isNavigatingCreate: false });
        wx.showToast({ title: '打开开团页失败', icon: 'none' });
      },
    });
  },

  // 删除团单：单次确认；有未收款（已收<应收）时把提醒并进同一个弹窗里。软删。
  onDeleteItinerary(e) {
    const { id } = e.currentTarget.dataset;
    const item = (this.data.itineraryList || []).find(entry => String(entry.id) === String(id));
    if (!id || !item) return;
    const hasUnpaid = Number(item.totalReceived || 0) < Number(item.totalReceivable || 0);
    wx.showModal({
      title: '删除团单',
      content: hasUnpaid
        ? `确定要删除「${item.title}」吗？⚠ 该团单尚有未收款的客户订单，删除后不可恢复。`
        : `确定要删除「${item.title}」吗？删除后不可恢复。`,
      confirmText: '删除',
      confirmColor: '#e34d59',
      success: async (res) => {
        if (!res.confirm) return;
        const removeRes = await callBusinessData({ resource: 'groupOrders', action: 'remove', data: { id } });
        if (!removeRes.success) {
          toastError(removeRes.error || '删除团单失败');
          return;
        }
        toastSuccess(RESULT_TEXT.remove);
        await this.fetchItineraryList();
      },
    });
  },

  // 单一取数路径（合并原 fetchItineraryList 无筛选 与 applyFilters 带筛选）：
  // 读 this.data 的 searchKeyword/currentStatus，用 listVisibleWithStats 带回人数/已收/应收。
  async fetchItineraryList() {
    // A13 登录闸门：未登录直接导登录页并带回原页，不再停在空态给一颗「去登录」。
    // 摆在 refreshSession 之后（唯二呼叫点 onLoad/onShow 都先 refresh），否则冷启动
    // 身分还没水合就会把已登录的人也踢去登录页。
    if ((this as any).requireLogin()) return;
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

  viewItinerary(e) {
    const {
      id
    } = e.currentTarget.dataset;
    // 不再强制 readonly：由后端 canManageGroupOrder 按归属决定视图——管理者看管理视图(含分享/QR)，客户看客户视图。
    navigateByUrl(`/sub-pages/groupOrder/detail/index?id=${id}`, {
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
