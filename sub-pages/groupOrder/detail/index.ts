import {
  GroupOrder
} from '~/models/GroupOrder';
import {
  GroupOrderMock
} from '../../../mock/groupOrder/index';


Page({
  data: {
    pageTitle: '',
    groupOrder: new GroupOrder(),
    showDetails: false,
    selectedMemberOrder: {},
    showConfirmDialog: false,
    selectedMemberOrderId: 0,
    groupOrderId: null,
  },

  onLoad(options) {
    //  let id = options.id;
    let id = 1;
    if (id) {
      this.setData({
        pageTitle: '查看行程',
        groupOrderId: id,
      });
      this.fetchGroupOrderDetail(id);
    } else {
      this.setData({
        pageTitle: '新增行程',
      });
    }
  },

  async fetchGroupOrderDetail() {
   
    try {
      const res = await GroupOrderMock.fetchById(this.data.groupOrderId)
     
      if (res.code === 200) {
        this.setData({
          groupOrder: res.data
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
    const {
      index
    } = e.currentTarget.dataset;

    const selectedOrder = this.data.groupOrder.memberOrderList[index];

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
      urls: [this.data.groupOrder.qrCodeUrl],
      current: this.data.groupOrder.qrCodeUrl
    });
  },

  onImageError(e) {
    const {
      errMsg
    } = e.detail;
    const {
      qrCodeUrl
    } = this.data.groupOrder.qrCodeUrl;

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
      'groupOrder.qrCodeUrl': '/assets/images/error-qr.png'
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
      selectedMemberOrderId: id
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
    const id = this.data.selectedMemberOrderId;

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
      this.fetchGroupOrderDetail(2);

    }, 800);
  },

  onManageProducts(e) {
    let id = this.data.groupOrderId;
    //let id = null
    if (id) {
      wx.navigateTo({
        url: `/sub-pages/groupOrder/productManage/index?id=${id}`,
        fail: (err) => {
          console.error("跳轉商品管理頁面失敗：", err);
        }
      });
    } else {
      const app = getApp();
      wx.showModal({
        title: '提示',
        content: '很抱歉，系統發生錯誤',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: app.globalData.themeColor,
        success(res) {
          if (res.confirm) {
            //TODO 寫LOG
          }
        }
      })
    }
  }
});