import {
  Itinerary
} from '~/models/Itinerary';
import {
  ItineraryMock
} from '~/mock/itinerary/index';
import {
  getItineraryStatusList,
  getStatusTextByValue
} from '~/enum/ItineraryStatus'

Page({
  data: {
    titleText: '行程',
    // 模擬數據：行程名稱、狀態、日期
    itineraryList: [],
    statusOptions: getItineraryStatusList(),
    currentStatus: 0,
  },

  // 初始化
  async onLoad(options) {
    //console.log('頁面載入，參數為：', options);
    await this.fetchItineraryList();
  },

  async fetchItineraryList() {
    wx.showLoading({
      title: '載入中'
    });

    try {
      const res = await ItineraryMock.fetchItineraryListMock();
      if (res.code === 200) {

        const list = res.data.map(item => ({
          ...item,
          statusText: getStatusTextByValue(item.status)
        }));

        this.setData({
          itineraryList: list
        });
      }
    } catch (err) {
      console.error('抓取行程清單失敗', err);
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
      url: `/pages/itinerary/orderList/index?id=${id}&readonly=1`,
      fail: (err) => {
        console.error("跳轉詳情頁失敗：", err);
      }
    });
  },

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'itinerary'
      });
    }
  },

  addItinerary(e) {
    const id = e.currentTarget?.dataset?.id;
    const url = id ? `/pages/itinerary/detail/index?id=${id}` : '/pages/itinerary/detail/index';
    console.log(url)
    wx.navigateTo({
      url: url,
      success: () => console.log('跳轉成功'),
      fail: (err) => {
        console.error('跳轉失敗原因:', err); // 💡 這行會告訴你為什麼沒換畫面
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({
            url
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
    const res = await ItineraryMock.filterItineraryList(searchKeyword, currentStatus);

    this.setData({
      // 確保畫面更新的是篩選後的結果
      itineraryList: res.data
    });
  }

});