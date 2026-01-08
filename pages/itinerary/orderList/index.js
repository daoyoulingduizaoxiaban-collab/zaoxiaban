import {
  Itinerary
} from '~/models/Itinerary';
import {
  ItineraryMock
} from '../../../mock/itinerary/index';

Page({
  data: {
    pageTitle: '',
    itinerary: new Itinerary(),
    showDetails: false, // 補上這個
    selectedOrder: {} // 補上這個
  },

  onLoad(options) {
    //todo 測試假資料
    let id = 1 ?? options.id;

    if (id) {
      this.setData({
        pageTitle: '查看行程',
      });
      this.fetchItineraryDetail(id);
    } else {
      this.setData({
        pageTitle: '新增行程',
      });
    }
  },

  async fetchItineraryDetail(id) {
    try {
      const res = await ItineraryMock.fetchById(id)

      if (res.code === 200) {
        this.setData({
          itinerary: res.data
        });
      }

    } catch (err) {
      console.error('抓取行程清單失敗', err);
    } finally {
      wx.hideLoading();
    }

  },

  onBack() {
    wx.navigateBack();
  },

  onSave() {
    const action = this.data.isEdit ? '更新' : '創建';
    wx.showToast({
      title: `${action}成功`,
      icon: 'success'
    });
    setTimeout(() => wx.navigateBack(), 1500);
    // 保存邏輯...
  },

  // 2. 匯出報表
  onExportReport() {
    wx.showActionSheet({
      itemList: ['匯出為 PDF', '匯出為 Excel', '發送到電子郵件'],
      success: (res) => {
        console.log('選擇匯出方式：', res.tapIndex);
        // 這裡可以串接你的後端 API
      }
    });
  },

  goToOrderDetail(e) {
    // 1. 從 WXML 的 data-id 獲取訂單 ID
    // 注意：如果是點擊 card 觸發，ID 會在 currentTarget 中
    const orderId = e.currentTarget.dataset.id;

    if (!orderId) {
      console.error("未找到訂單 ID");
      return;
    }

    // 2. 執行跳轉
    // 路徑對應你截圖中的 pages/order/index
    wx.navigateTo({
      url: `/pages/order/index?id=${orderId}`,
      success: () => {
        console.log(`正在進入訂單 #${orderId} 的詳情頁`);
      },
      fail: (err) => {
        console.error("跳轉失敗：", err);
        wx.showToast({
          title: '頁面跳轉失敗',
          icon: 'none'
        });
      }
    });
  },

  onShowOrderDetails(e) {
    try {
      const {
        index
      } = e.currentTarget.dataset;
     
      const order = this.data.itinerary.itineraryOrders[index];

      // 如果狀態是未付款，可以決定是否要擋住（或是照樣顯示明細但提示未付）
      this.setData({
        selectedOrder: order,
        showDetails: true
      });
    } catch (error) {
      console.log(error)
    }

  },

  onCloseDetails() {
    this.setData({
      showDetails: false
    });
  }
});