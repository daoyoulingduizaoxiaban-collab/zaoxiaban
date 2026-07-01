import {
  GroupOrder
} from '~/models/GroupOrder';
import { GroupOrderRepository } from '~/repositories/groupOrderRepository';
import {
  getGroupOrderStatusList,
  getGroupOrderStatusTextByValue
} from '~/enum/GroupOrderStatus'
import { AuthService } from '~/services/auth/authService';

Page({
  data: {
    titleText: '团单',
    itineraryList: [],
    searchKeyword: '',
    statusOptions: getGroupOrderStatusList(),
    currentStatus: 0,
    roleScopeText: '',
    canCreateGroupOrder: false,
  },

  // 初始化
  async onLoad() {
    await this.fetchItineraryList();
  },

  async fetchItineraryList() {
    wx.showLoading({
      title: '加载中'
    });

    try {
      const res = await GroupOrderRepository.listVisible();
      if (res.success) {

        const list = res.data.map(item => ({
          ...item,
          statusText: getGroupOrderStatusTextByValue(item.status)
        }));

        this.setData({
          itineraryList: list,
          roleScopeText: this.getRoleScopeText(),
          canCreateGroupOrder: this.canCreateGroupOrder()
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
    if (!profile) return '未登录，仅显示空列表';
    if (profile.role === 'guide') return '仅显示你创建或被授权管理的团单';
    if (profile.role === 'customer') return '仅显示你下过订单关联的团单';
    if (profile.role === 'owner' || profile.role === 'admin') return '当前为管理角色，可查看 QA 范围内团单';
    return '当前角色暂无团单权限';
  },

  canCreateGroupOrder() {
    const profile = AuthService.getCurrentProfile();
    return Boolean(profile && (profile.role === 'guide' || profile.role === 'owner' || profile.role === 'admin'));
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
    const {
      searchKeyword,
      currentStatus
    } = this.data;

    // 呼叫 Mock API，同時傳入兩個條件
    const res = await GroupOrderRepository.filterVisible(searchKeyword, currentStatus);

    this.setData({
      // 確保畫面更新的是篩選後的結果
      itineraryList: res.data
    });
  }

});
