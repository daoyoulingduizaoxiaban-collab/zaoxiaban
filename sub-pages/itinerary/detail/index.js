import {
  Itinerary
} from '~/models/Itinerary';
import {
  ItineraryMock
} from '../../../mock/itinerary/index';

//todo 測試假資料
const g_id = 1;

Page({
  data: {
    pageTitle: '',
    itinerary: new Itinerary(),
    showDetails: false,
    selectedCustomerOrder: {},
    showConfirmDialog: false,
    selectedOrderId: 0
  },

  onLoad(options) {
    let id = g_id;

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
    // 從 data-index 取得目前點擊的索引
    const {
      index
    } = e.currentTarget.dataset;

    // 依照你的資料結構，從 itinerary 裡的 customerOrderList 抓取物件
    const selectedOrder = this.data.itinerary.customerOrderList[index];

    if (selectedOrder) {
      this.setData({
        selectedOrder: selectedOrder,
        showDetails: true
      });
    } else {
      console.error("找不到對應的訂單資料", index);
    }
  },

  onCloseDetails() {
    this.setData({
      showDetails: false
    });
  },
  previewQR() {
    wx.previewImage({
      urls: [this.data.itinerary.qrCodeUrl],
      current: this.data.itinerary.qrCodeUrl
    });
  },

  onImageError(e) {
    const {
      errMsg
    } = e.detail;
    const {
      qrCodeUrl
    } = this.data.itinerary.qrCodeUrl;

    console.error('【圖片加載失敗】:', errMsg);
    console.error('【當前錯誤路徑】:', qrCodeUrl);

    // 快速診斷建議
    if (qrCodeUrl.indexOf('http://') === 0) {
      console.warn('⚠️ 錯誤提示：微信小程序正式環境要求使用 https，請檢查連結協定。');
    }

    if (!qrCodeUrl || qrCodeUrl === '') {
      console.warn('⚠️ 錯誤提示：qrCodeUrl 為空，請檢查 API 回傳數據。');
    }

    // 可選：載入失敗時給用戶一個預設圖
    this.setData({
      'itinerary.qrCodeUrl': '/assets/images/error-qr.png'
    });

    wx.showToast({
      title: '圖片載入失敗',
      icon: 'none'
    });
  },

  onConfirmPayment(e) {
    const {
      id
    } = e.currentTarget.dataset;
    this.setData({
      showConfirmDialog: true,
      selectedOrderId: id
    });

    console.log(id)
    console.log(e)
  },

  // 彈窗點擊取消
  handleDialogClose() {
    this.setData({
      showConfirmDialog: false
    });
  },

  // 彈窗點擊確認
  async handleDialogConfirm() {
    const id = this.data.selectedOrderId;

    wx.showLoading({
      title: '處理中...'
    });

    // 這裡模擬 API 請求，將狀態改為 2 (已確認)
    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        showConfirmDialog: false
      });

      wx.showToast({
        title: '款項已確認',
        icon: 'success'
      });

      //TODO 模擬刷新資料
      this.fetchItineraryDetail(2);

    }, 800);
  }
});