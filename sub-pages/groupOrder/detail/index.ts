import {
  GroupOrder
} from '~/models/GroupOrder';
import { MemberOrder } from '~/models/MemberOrder';
import {
  GroupOrderMock
} from '../../../mock/groupOrder/index';


Page({
  data: {
    pageTitle: '查看行程',
    groupOrder: new GroupOrder(),
    groupOrderId: 0,
    showDetails: false,
    selectedMemberOrder: new MemberOrder(),
    showConfirmDialog: false,
    selectedMemberOrderId: 0,
  },

  onLoad(options) {
    const id = Number(options.id || 1);
    if (id) {
      this.setData({
        groupOrderId: id
      });
      this.fetchGroupOrderDetail(id);
    } else {
      this.setData({
        pageTitle: '新增行程',
      });
    }
  },

  async fetchGroupOrderDetail(id) {

    try {
      const res = await GroupOrderMock.fetchById(id)
      if (res.code === 200) {
        this.setData({
          groupOrder: res.data,
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
      success: () => {
        wx.showToast({
          title: '匯出功能尚未串接',
          icon: 'none'
        });
      }
    });
  },

  goToOrderDetail(e) {
    // 1. 從 WXML 的 data-id 獲取訂單 ID
    // 注意：如果是點擊 card 觸發，ID 會在 currentTarget 中
    const orderId = e.currentTarget.dataset.id;

    if (!orderId) {
      wx.showToast({
        title: '未找到訂單 ID',
        icon: 'none'
      });
      return;
    }

    // 2. 執行跳轉
    // 路徑對應你截圖中的 pages/order/index
    wx.navigateTo({
      url: `/pages/order/index?id=${orderId}`,
      fail: () => {
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

    const selectedMemberOrder = this.data.groupOrder.memberOrderList[index];

    if (selectedMemberOrder) {
      this.setData({
        selectedMemberOrder: selectedMemberOrder,
        showDetails: true
      });
    } else {
      wx.showToast({
        title: '找不到訂單資料',
        icon: 'none'
      });
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

  onImageError() {
    const {
      qrCodeUrl
    } = this.data.groupOrder;

    if (!qrCodeUrl || qrCodeUrl === '') {
      wx.showToast({
        title: 'QR Code 路徑為空',
        icon: 'none'
      });
    } else if (qrCodeUrl.indexOf('http://') === 0) {
      wx.showToast({
        title: '請使用 HTTPS 圖片',
        icon: 'none'
      });
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

  },

  // 彈窗點擊取消
  handleDialogClose() {
    this.setData({
      showConfirmDialog: false
    });
  },

  // 彈窗點擊確認
  async handleDialogConfirm() {
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

      this.fetchGroupOrderDetail(this.data.groupOrderId);

    }, 800);
  },

  onManageProducts() {
    const id = this.data.groupOrderId;
    if (id) {
      wx.navigateTo({
        url: `/sub-pages/groupOrder/productList/index?id=${id}`,
        fail: () => {
          wx.showToast({
            title: '跳轉商品管理失敗',
            icon: 'none'
          });
        }
      });
    } else {
      const app = getApp();
      wx.showModal({
        title: '提示',
        content: '很抱歉，系統發生錯誤',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: app.globalData.themeColor
      })
    }
  }
});
