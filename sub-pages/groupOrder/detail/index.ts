import {
  GroupOrder
} from '~/models/GroupOrder';
import { MemberOrder } from '~/models/MemberOrder';
import {
  GroupOrderMock
} from '../../../mock/groupOrder/index';


Page({
  data: {
    pageTitle: '团单详情',
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
        pageTitle: '新建团单',
      });
    }
  },

  async fetchGroupOrderDetail(id) {

    try {
      const res = await GroupOrderMock.fetchById(id)
      if (res.code === 200) {
        this.setData({
          groupOrder: res.data,
          pageTitle: res.data.title ? '团单详情' : '团单未找到',
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
      title: '订单详情页暂未开发',
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

  // 彈窗點擊確認
  async handleDialogConfirm() {
    wx.showLoading({
      title: '处理中...'
    });

    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        showConfirmDialog: false
      });

      wx.showToast({
        title: 'QA 展示模式，暂未保存',
        icon: 'none'
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
