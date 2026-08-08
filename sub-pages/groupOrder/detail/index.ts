import {
  GroupOrder
} from '~/models/GroupOrder';
import { MemberOrder } from '~/models/MemberOrder';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { generateGroupOrderQr, callBusinessData } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { navigateByUrl } from '~/utils/navigation';
import { RESULT_TEXT, toastSuccess } from '~/utils/feedback';
import { getGroupOrderStatusTextByValue } from '~/enum/GroupOrderStatus';

const buildCustomerEntryPath = (id, shareToken = '') => {
  const basePath = `/pages/customerOrders/edit/index?groupOrderId=${encodeURIComponent(String(id || ''))}`;
  const normalizedToken = String(shareToken || '').trim();
  return normalizedToken ? `${basePath}&shareToken=${encodeURIComponent(normalizedToken)}` : basePath;
};

const buildPriceDisplay = (priceSetting = []) => {
  const tierLabels = (priceSetting || [])
    .filter(rule => Number(rule.minQuantity) > 0)
    .sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity))
    .map(rule => `${Number(rule.minQuantity)}件 ￥${rule.totalPrice}`);
  return tierLabels.length === 0 ? '未设置价格' : tierLabels.join(' / ');
};

const roundMoney = value => Math.round(Number(value || 0) * 100) / 100;
// 每一档价格区间的可读文案，优先显示总价（#C1 让客户看到全部区间，如「3件 ¥30」「5件 ¥45」）。
const buildPriceTiers = (priceSetting = []) => (priceSetting || [])
  .map(rule => ({
    minQuantity: Number(rule.minQuantity || 0),
    label: `${Number(rule.minQuantity || 0)}件 ￥${roundMoney(rule.totalPrice || rule.unitPrice)}`,
  }))
  .filter(tier => tier.minQuantity > 0)
  .sort((a, b) => a.minQuantity - b.minQuantity);

// 客户视图「本团在售商品」：仅取快照中「上架(status=2)」的商品对外展示（A6）。
const buildOnSaleProducts = (productList = []) => (productList || [])
  .filter(product => Number(product.status) === 2)
  .map(product => ({
    id: product.id,
    title: product.title,
    description: product.description || '',
    priceDisplay: buildPriceDisplay(product.priceSetting),
    priceTiers: buildPriceTiers(product.priceSetting),
  }));

Page({
  data: {
    pageTitle: '团单详情',
    groupOrder: new GroupOrder(),
    groupOrderId: '',
    showDetails: false,
    selectedMemberOrder: new MemberOrder(),
    showConfirmDialog: false,
    selectedMemberOrderId: '',
    // 打开确认收款弹窗当下那张订单的状态：0=客户没声明过(要连带登记付款)，1=已声明(直接确认)。
    confirmOrderStatus: 1,
    showCancelDialog: false,
    confirmForm: {
      paymentMethod: '',
      confirmedAmount: '',
      confirmRemark: '',
    },
    cancelForm: {
      cancelRemark: '',
    },
    customerEntryPath: '',
    pageState: 'loading',
    loadErrorText: '',
    forceReadonly: false,
    canManageGroupOrder: false,
    onSaleProducts: [],
    showOnSaleProducts: false,
  },

  async onLoad(options) {
    await AuthService.refreshSession();
    const forceReadonly = String(options.readonly || '') === '1';
    const id = options.id || options.groupOrderId ? String(options.id || options.groupOrderId) : '';
    this.setData({ forceReadonly });
    if (id) {
      this.setData({
        groupOrderId: id,
        customerEntryPath: buildCustomerEntryPath(id),
      });
      await this.fetchGroupOrderDetail(id);
    } else {
      this.setData({
        pageTitle: '团单详情',
        pageState: 'error',
        loadErrorText: '缺少团单 ID，请返回团单列表重新进入。',
      });
    }
  },

  onShareAppMessage() {
    const groupOrder = this.data.groupOrder || {};
    const fallbackPath = buildCustomerEntryPath(this.data.groupOrderId, groupOrder.shareToken);
    return {
      title: `${groupOrder.title || '团单'}｜客户下单入口`,
      path: groupOrder.sharePath || fallbackPath,
    };
  },

  async fetchGroupOrderDetail(id) {
    this.setData({ pageState: 'loading' });
    try {
      const res = await CustomerOrderService.getGroupOrderDetail(id)
      if (res.success) {
        const groupOrder = {
          ...res.data,
          // 状态文字一律由 status 推导（库里不存 statusText，存了也可能过期）。
          status: Number(res.data.status),
          statusText: getGroupOrderStatusTextByValue(Number(res.data.status)),
          sharePath: res.data.sharePath || buildCustomerEntryPath(id, res.data.shareToken),
        };
        // 门控改用数据层返回的 canManageGroupOrder 标记；readonly=1 强制走客户视图（E-4）。
        const canManageGroupOrder = Boolean(res.data.canManageGroupOrder) && !this.data.forceReadonly;
        this.setData({
          groupOrder,
          customerEntryPath: res.data.sharePath || buildCustomerEntryPath(id, res.data.shareToken),
          pageTitle: res.data.title ? '团单详情' : '团单未找到',
          canManageGroupOrder,
          onSaleProducts: canManageGroupOrder ? [] : buildOnSaleProducts(res.data.productList),
          pageState: 'ready',
          loadErrorText: '',
        });
        // 二维码缺失时自动补生成（团单建立后即有码，无需手动点）
        this.ensureShareQr();
      } else {
        const errorText = res.error || '加载团单失败';
        this.setData({ pageState: 'error', loadErrorText: errorText });
        wx.showToast({
          title: errorText,
          icon: 'none'
        });
      }

    } catch (err) {
      this.setData({ pageState: 'error', loadErrorText: '加载团单失败' });
      wx.showToast({
        title: '加载团单失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }

  },

  onRetry() {
    this.fetchGroupOrderDetail(this.data.groupOrderId);
  },

  toggleOnSaleProducts() {
    this.setData({ showOnSaleProducts: !this.data.showOnSaleProducts });
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
  // 自动补生成团单二维码（无 qrCodeUrl 时静默执行，不打扰用户）：
  // scene=shareToken（唯一、够短），客户扫码后由后端凭 token 反查团单。
  // 生成后写回团单（groupOrders.update）持久化，下次进来直接显示。
  async ensureShareQr() {
    if (this._qrGenerating) return;
    const groupOrder = this.data.groupOrder || {};
    const shareToken = String(groupOrder.shareToken || '').trim();
    if (!this.data.canManageGroupOrder || !shareToken || (groupOrder.qrCodeUrl || '').trim()) return;
    this._qrGenerating = true;
    try {
      const res = await generateGroupOrderQr({ scene: shareToken, page: 'pages/customerOrders/edit/index' });
      if (res && res.success && res.data && res.data.fileID) {
        this.setData({ 'groupOrder.qrCodeUrl': res.data.fileID });
        // 持久化（失败不阻塞显示，下次进来会再自动补生成）
        callBusinessData({
          resource: 'groupOrders',
          action: 'update',
          data: { id: this.data.groupOrderId, data: { qrCodeUrl: res.data.fileID } },
        });
      } else {
        // 生成失败要让团主看到原因（如云函数未部署/权限问题）；本地后端不支持则静默。
        const errorText = (res && res.error) || '二维码生成失败';
        if (errorText.indexOf('本地后端') !== 0) {
          wx.showToast({ title: `二维码生成失败：${errorText}`, icon: 'none', duration: 3000 });
        }
      }
    } catch (err) {
      wx.showToast({ title: '二维码生成失败', icon: 'none' });
    } finally {
      this._qrGenerating = false;
    }
  },

  // #4 收单状态切换：开放收单(1) ⇄ 停止收单(2)，二次确认后走 groupOrders.update。
  onToggleStatus() {
    if (!this.data.canManageGroupOrder) return;
    const groupOrder = this.data.groupOrder || {};
    const isOpen = Number(groupOrder.status) === 1;
    const nextStatus = isOpen ? 2 : 1;
    const actionText = isOpen ? '停止收单' : '恢复收单';
    wx.showModal({
      title: `确认${actionText}？`,
      content: isOpen ? '停止后客户将不能再对本团下单。' : '恢复后客户可继续对本团下单。',
      confirmText: actionText,
      success: async (res) => {
        if (!res.confirm) return;
        const result = await callBusinessData({
          resource: 'groupOrders',
          action: 'update',
          data: { id: this.data.groupOrderId, data: { status: nextStatus } },
        });
        if (!result.success) {
          wx.showToast({ title: result.error || '操作失败', icon: 'none' });
          return;
        }
        toastSuccess(RESULT_TEXT.update);
        this.fetchGroupOrderDetail(this.data.groupOrderId);
      },
    });
  },

  previewQR() {
    const qrCodeUrl = (this.data.groupOrder.qrCodeUrl || '').trim();
    const canPreview = qrCodeUrl.indexOf('https://') === 0 || qrCodeUrl.indexOf('cloud://') === 0 || qrCodeUrl.indexOf('/') === 0 || qrCodeUrl.indexOf('wxfile://') === 0;

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
      'groupOrder.qrCodeUrl': ''
    });

    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },

  // 「确认收款」这一个动作要同时覆盖两种起点：客户已经声明付款(status=1，
  // 直接确认)、客户没走 app 内声明(status=0，团主一步把登记+确认一起做完，
  // 不拆成登记付款/确认收款两个动作，见用户反馈"不要分兩個動作太麻煩")。
  onConfirmPayment(e) {
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能确认收款', icon: 'none' });
      return;
    }
    const {
      id
    } = e.currentTarget.dataset;
    const selectedOrder = (this.data.groupOrder.memberOrderList || [])
      .find(order => String(order.id) === String(id));
    this.setData({
      showConfirmDialog: true,
      selectedMemberOrderId: id,
      confirmOrderStatus: selectedOrder ? Number(selectedOrder.status) : 1,
      confirmForm: {
        paymentMethod: '',
        confirmedAmount: selectedOrder ? String(selectedOrder.declaredAmount || selectedOrder.totalPrice || selectedOrder.originalTotalPrice || '') : '',
        confirmRemark: '',
      },
    });

  },

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
      selectedMemberOrderId: id,
      cancelForm: {
        cancelRemark: '',
      },
    });
  },

  handleCancelDialogClose() {
    this.setData({
      showCancelDialog: false
    });
  },

  async handleCancelDialogConfirm() {
    const cancelRemark = String(this.data.cancelForm.cancelRemark || '').trim();
    wx.showLoading({
      title: '处理中...'
    });

    const res = await CustomerOrderService.cancelOrder(this.data.selectedMemberOrderId, {
      cancelRemark,
      note: cancelRemark ? `订单已取消：${cancelRemark}` : '订单已取消',
    });
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

    toastSuccess(RESULT_TEXT.update);
    this.fetchGroupOrderDetail(this.data.groupOrderId);
  },

  async handleDialogConfirm() {
    const paymentMethod = String(this.data.confirmForm.paymentMethod || '').trim();
    const confirmedAmountText = String(this.data.confirmForm.confirmedAmount || '').trim();
    const confirmedAmount = Number(confirmedAmountText);
    const confirmRemark = String(this.data.confirmForm.confirmRemark || '').trim();
    const isUndeclared = this.data.confirmOrderStatus === 0;
    const selectedOrder = (this.data.groupOrder.memberOrderList || [])
      .find(order => String(order.id) === String(this.data.selectedMemberOrderId));
    const declaredAmount = Number(selectedOrder && selectedOrder.declaredAmount ? selectedOrder.declaredAmount : 0);
    const totalPrice = Number(selectedOrder && selectedOrder.totalPrice ? selectedOrder.totalPrice : 0);
    const maxPayableAmount = declaredAmount > 0 ? declaredAmount : totalPrice;
    if (!confirmedAmountText || Number.isNaN(confirmedAmount) || confirmedAmount <= 0) {
      wx.showToast({ title: '请填写有效实收金额', icon: 'none' });
      return;
    }
    if (maxPayableAmount > 0 && confirmedAmount > maxPayableAmount) {
      wx.showToast({ title: declaredAmount > 0 ? '实收金额不能超过申报金额' : '实收金额不能超过订单金额', icon: 'none' });
      return;
    }
    if (isUndeclared && !paymentMethod) {
      wx.showToast({ title: '请填写付款方式', icon: 'none' });
      return;
    }

    wx.showLoading({
      title: '处理中...'
    });

    // 客户没声明过(status=0)：登记付款+确认收款一步做完，不拆两个动作。
    if (isUndeclared) {
      const declareRes = await CustomerOrderService.declarePaid(this.data.selectedMemberOrderId, {
        paymentMethod,
        declaredAmount: confirmedAmount,
        note: `团主登记付款：￥${confirmedAmount}｜${paymentMethod}`,
      });
      if (!declareRes.success) {
        wx.hideLoading();
        this.setData({ showConfirmDialog: false });
        wx.showToast({ title: declareRes.error || '登记付款失败', icon: 'none' });
        return;
      }
    }

    const res = await CustomerOrderService.confirmPayment(this.data.selectedMemberOrderId, {
      confirmedAmount,
      confirmRemark,
      note: `团主确认收款：实收 ¥${confirmedAmount}${confirmRemark ? `｜${confirmRemark}` : ''}`,
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

    toastSuccess(RESULT_TEXT.update);
    this.fetchGroupOrderDetail(this.data.groupOrderId);
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

    navigateByUrl(`/sub-pages/groupOrder/add/index?id=${id}`, {
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
      navigateByUrl(`/sub-pages/groupOrder/productList/index?id=${id}`, {
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

  stopPanelTap() {},

  onConfirmInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    if (!field) return;
    this.setData({ [`confirmForm.${field}`]: value });
  },

  onCancelInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    if (!field) return;
    this.setData({ [`cancelForm.${field}`]: value });
  },

});
