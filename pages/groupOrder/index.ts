import {
  GroupOrder
} from '~/models/GroupOrder';
import {
  GroupOrderMock
} from '~/mock/groupOrder/index';
import {
  getGroupOrderStatusList,
  getGroupOrderStatusTextByValue
} from '~/enum/GroupOrderStatus'

Page({
  data: {
    titleText: '行程',
    // 模擬數據：行程名稱、狀態、日期
    itineraryList: [],
    statusOptions: getGroupOrderStatusList(),
    currentStatus: 0,
  },

  // 初始化
  async onLoad() {
    await this.fetchItineraryList();
  },

  async fetchItineraryList() {
    wx.showLoading({
      title: '載入中'
    });

    try {
      const res = await GroupOrderMock.fetchItineraryListMock();
      if (res.code === 200) {

        const list = res.data.map(item => ({
          ...item,
          statusText: getGroupOrderStatusTextByValue(item.status)
        }));

        this.setData({
          itineraryList: list
        });
      }
    } catch (err) {
      wx.showToast({
        title: '抓取行程失敗',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 點擊行程跳轉至詳情頁
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
        value: 'GroupOrder'
      });
    }
  },

  addItinerary(e) {
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
            title: '跳轉新增頁失敗',
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
    const res = await GroupOrderMock.filterItineraryList(searchKeyword, currentStatus);

    this.setData({
      // 確保畫面更新的是篩選後的結果
      itineraryList: res.data
    });
  }

});
