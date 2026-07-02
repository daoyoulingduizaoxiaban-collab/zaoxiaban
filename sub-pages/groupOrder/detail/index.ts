import {
  GroupOrder
} from '~/models/GroupOrder';
import { MemberOrder } from '~/models/MemberOrder';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';


Page({
  data: {
    pageTitle: '团单详情',
    groupOrder: new GroupOrder(),
    groupOrderId: 0,
    showDetails: false,
    selectedMemberOrder: new MemberOrder(),
    showConfirmDialog: false,
    selectedMemberOrderId: 0,
    showCancelDialog: false,
    saveModeText: '本地/QA 展示模式，尚未正式保存到云端',
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
        pageTitle: '新建团单',
      });
    }
  },

  async fetchGroupOrderDetail(id) {

    try {
      const res = await CustomerOrderService.getGroupOrderDetail(id)
      if (res.success) {
        this.setData({
          groupOrder: res.data,
          pageTitle: res.data.title ? '团单详情' : '团单未找到',
        });
      } else {
        wx.showToast({
          title: res.error || '加载团单失败',
          icon: 'none'
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

  onBack() {
    wx.navigateBack();
  },

  onSave() {
    wx.showToast({
      title: 'QA 展示模式，暂未保存',
      icon: 'none'
    });
  },

  onExportReport() {
    wx.showActionSheet({
      itemList: ['导出为 PDF', '导出为 Excel', '发送到邮箱'],
      success: () => {
        wx.showToast({
          title: 'QA 展示模式，暂未导出',
          icon: 'none'
        });
      }
    });
  },

  goToOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id;

    if (!orderId) {
      wx.showToast({
        title: '未找到订单 ID',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: '请在客户订单页查看详情',
      icon: 'none'
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
        title: '找不到订单资料',
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
    const qrCodeUrl = (this.data.groupOrder.qrCodeUrl || '').trim();
    const canPreview = qrCodeUrl.indexOf('https://') === 0 || qrCodeUrl.indexOf('/') === 0 || qrCodeUrl.indexOf('wxfile://') === 0;

    if (!qrCodeUrl) {
      wx.showToast({
        title: '暂无团单二维码',
        icon: 'none'
      });
      return;
    }

    if (!canPreview) {
      wx.showToast({
        title: '暂无团单二维码',
        icon: 'none'
      });
      return;
    }

    wx.previewImage({
      urls: [qrCodeUrl],
      current: qrCodeUrl,
      fail: () => {
        wx.showToast({
          title: '暂无团单二维码',
          icon: 'none'
        });
      }
    });
  },

  onImageError() {
    const {
      qrCodeUrl
    } = this.data.groupOrder;

    if (!qrCodeUrl || qrCodeUrl === '') {
      wx.showToast({
        title: '暂无团单二维码',
        icon: 'none'
      });
    } else if (qrCodeUrl.indexOf('http://') === 0) {
      wx.showToast({
        title: '请使用 HTTPS 图片',
        icon: 'none'
      });
    }

    this.setData({
      'groupOrder.qrCodeUrl': '/static/logo/zaoxiaban.png'
    });

    wx.showToast({
      title: '图片加载失败',
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

  onCancelOrder(e) {
    const {
      id
    } = e.currentTarget.dataset;
    this.setData({
      showCancelDialog: true,
      selectedMemberOrderId: id
    });
  },

  handleCancelDialogClose() {
    this.setData({
      showCancelDialog: false
    });
  },

  async handleCancelDialogConfirm() {
    wx.showLoading({
      title: '处理中...'
    });

    const res = await CustomerOrderService.cancelOrder(this.data.selectedMemberOrderId);
    wx.hideLoading();
    this.setData({
      showCancelDialog: false
    });

    if (!res.success) {
      wx.showToast({
        title: res.error || '取消订单失败',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: this.data.saveModeText,
      icon: 'none'
    });
    this.fetchGroupOrderDetail(this.data.groupOrderId);
  },

  // 彈窗點擊確認
  async handleDialogConfirm() {
    wx.showLoading({
      title: '处理中...'
    });

    const res = await CustomerOrderService.confirmPayment(this.data.selectedMemberOrderId);
    wx.hideLoading();
    this.setData({
      showConfirmDialog: false
    });

    if (!res.success) {
      wx.showToast({
        title: res.error || '确认收款失败',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: this.data.saveModeText,
      icon: 'none'
    });
    this.fetchGroupOrderDetail(this.data.groupOrderId);
  },

  onCustomerOrderEntry() {
    const id = this.data.groupOrderId;
    if (!id) {
      wx.showToast({
        title: '缺少团单 ID',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/customerOrders/edit/index?groupOrderId=${id}`,
      fail: () => {
        wx.showToast({
          title: '打开客户下单页失败',
          icon: 'none'
        });
      }
    });
  },

  onEditGroupOrder() {
    const id = this.data.groupOrderId;
    if (!id) {
      wx.showToast({
        title: '缺少团单 ID',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/sub-pages/groupOrder/add/index?id=${id}`,
      fail: () => {
        wx.showToast({
          title: '打开编辑团单失败',
          icon: 'none'
        });
      }
    });
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
