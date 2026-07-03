import {
  GroupOrder
} from '~/models/GroupOrder';
import { MemberOrder } from '~/models/MemberOrder';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';


Page({
  data: {
    pageTitle: '团单详情',
    groupOrder: new GroupOrder(),
    groupOrderId: '',
    showDetails: false,
    selectedMemberOrder: new MemberOrder(),
    showConfirmDialog: false,
    selectedMemberOrderId: '',
    showCancelDialog: false,
    saveModeText: '读取团单资料中',
    customerEntryPath: '',
    isDetailLoaded: false,
    canManageGroupOrder: false,
  },

  onLoad(options) {
    const id = options.id ? String(options.id) : '';
    if (id) {
      this.setData({
        groupOrderId: id,
        customerEntryPath: `/pages/customerOrders/edit/index?groupOrderId=${id}`,
      });
      this.fetchGroupOrderDetail(id);
    } else {
      this.setData({
        pageTitle: '新建团单',
      });
    }
  },

  onShareAppMessage() {
    const groupOrder = this.data.groupOrder || {};
    return {
      title: `${groupOrder.title || '团单'}｜客户下单入口`,
      path: groupOrder.sharePath || `/pages/customerOrders/edit/index?groupOrderId=${this.data.groupOrderId}`,
    };
  },

  async fetchGroupOrderDetail(id) {

    try {
      const res = await CustomerOrderService.getGroupOrderDetail(id)
      if (res.success) {
        this.setData({
          groupOrder: {
            ...res.data,
            sharePath: res.data.sharePath || `/pages/customerOrders/edit/index?groupOrderId=${id}`,
          },
          customerEntryPath: res.data.sharePath || `/pages/customerOrders/edit/index?groupOrderId=${id}`,
          pageTitle: res.data.title ? '团单详情' : '团单未找到',
          saveModeText: getSaveModeText(res.meta),
          isDetailLoaded: true,
          canManageGroupOrder: this.canManageGroupOrder(),
        });
      } else {
        this.setData({ isDetailLoaded: true, saveModeText: res.error || '加载团单失败' });
        wx.showToast({
          title: res.error || '加载团单失败',
          icon: 'none'
        });
      }

    } catch (err) {
      this.setData({ isDetailLoaded: true, saveModeText: '加载团单失败' });
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
    const path = this.data.groupOrder.sharePath || `/pages/customerOrders/edit/index?groupOrderId=${this.data.groupOrderId}`;
    if (!this.data.groupOrderId) {
      wx.showToast({
        title: '缺少团单 ID',
        icon: 'none'
      });
      return;
    }
    wx.setClipboardData({
      data: path,
      success: () => wx.showToast({ title: '客户入口已复制', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制客户入口失败', icon: 'none' }),
    });
  },

  onExportReport() {
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能导出团单报表', icon: 'none' });
      return;
    }
    const groupOrder = this.data.groupOrder || {};
    const orders = groupOrder.memberOrderList || [];
    const lines = [
      `团单：${groupOrder.title || ''}`,
      `状态：${groupOrder.statusText || ''}`,
      `应收总金额：￥${groupOrder.totalReceivable || 0}`,
      `已收总金额：￥${groupOrder.totalReceived || 0}`,
      `下单人数：${groupOrder.totalCustomers || orders.length || 0}`,
      '',
      '客户订单：',
      ...orders.map(order => [
        `#${order.id}`,
        order.customerName || `客户 ${order.customerUserId || order.userId || ''}`,
        `状态 ${order.statusText || order.status}`,
        `金额 ￥${order.totalPrice || 0}`,
      ].join('｜')),
    ];

    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '报表摘要已复制', icon: 'success' }),
      fail: () => wx.showToast({ title: '导出报表失败', icon: 'none' }),
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
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能确认收款', icon: 'none' });
      return;
    }
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
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能取消订单', icon: 'none' });
      return;
    }
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
      title: getSaveModeText(res.meta),
      icon: 'none'
    });
    this.fetchGroupOrderDetail(this.data.groupOrderId);
  },

  // 彈窗點擊確認
  async handleDialogConfirm() {
    wx.showLoading({
      title: '处理中...'
    });

    const selectedOrder = (this.data.groupOrder.memberOrderList || [])
      .find(order => String(order.id) === String(this.data.selectedMemberOrderId));
    const confirmedAmount = selectedOrder && (selectedOrder.totalPrice || selectedOrder.originalTotalPrice);
    const res = await CustomerOrderService.confirmPayment(this.data.selectedMemberOrderId, {
      confirmedAmount,
      confirmRemark: '团单详情确认到账',
    });
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
      title: getSaveModeText(res.meta),
      icon: 'none'
    });
    this.fetchGroupOrderDetail(this.data.groupOrderId);
  },

  onCustomerOrderEntry() {
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能生成客户下单入口', icon: 'none' });
      return;
    }
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

  onCopyCustomerEntry() {
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能复制客户下单入口', icon: 'none' });
      return;
    }
    const path = this.data.groupOrder.sharePath || `/pages/customerOrders/edit/index?groupOrderId=${this.data.groupOrderId}`;
    wx.setClipboardData({
      data: path,
      success: () => wx.showToast({ title: '客户入口已复制', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制客户入口失败', icon: 'none' }),
    });
  },

  onEditGroupOrder() {
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能编辑团单', icon: 'none' });
      return;
    }
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
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能管理本团商品', icon: 'none' });
      return;
    }
    const id = this.data.groupOrderId;
    if (id) {
      wx.navigateTo({
        url: `/sub-pages/groupOrder/productList/index?id=${id}`,
        fail: () => {
          wx.showToast({
            title: '打开本团商品失败',
            icon: 'none'
          });
        }
      });
    } else {
      const app = getApp();
      wx.showModal({
        title: '提示',
        content: '缺少团单 ID，请返回团单列表重新进入。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: app.globalData.themeColor
      })
    }
  },

  canManageGroupOrder() {
    return canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.GROUP_ORDER_CREATE);
  }
});
