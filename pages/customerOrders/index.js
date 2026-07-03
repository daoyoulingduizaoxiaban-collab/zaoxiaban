import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { getMemberOrderStatusList } from '~/enum/MemberOrderStatus';

const MEMBER_ORDER_STATUS_TEXT = getMemberOrderStatusList()
  .reduce((map, item) => ({ ...map, [item.value]: item.label }), {});

Page({
  data: {
    titleText: '客户订单',
    allCustomerOrdersList: [],
    customerOrdersList: [],
    statusOptions: [{ label: '全部', value: -1 }, ...getMemberOrderStatusList()],
    currentStatus: -1,
    roleScopeText: '',
    canCreateCustomerOrder: false,
    saveModeText: '',
    isLoggedIn: false,
    canUseBusiness: false,
    accessStateText: '',
    isLoading: false,
    loadErrorText: '',
    actionPanelVisible: false,
    actionType: '',
    actionOrderId: '',
    actionPanelTitle: '',
    actionSubmitText: '提交',
    isSubmittingAction: false,
    actionForm: {
      paymentMethod: '',
      paymentRemark: '',
      paymentProofUrls: [],
      confirmedAmount: '',
      confirmRemark: '',
      cancelRemark: '',
    },
  },

  onLoad() {
    this.loadQaOrders();
  },

  async loadQaOrders() {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) {
      this.setData({
        customerOrdersList: [],
        allCustomerOrdersList: [],
        roleScopeText: AuthService.getAccessStateText(profile),
        canCreateCustomerOrder: false,
        saveModeText: '',
        isLoggedIn: Boolean(profile),
        canUseBusiness: false,
        accessStateText: AuthService.getAccessStateText(profile),
        isLoading: false,
        loadErrorText: '',
      });
      return;
    }

    this.setData({ isLoading: true, loadErrorText: '' });
    const res = await CustomerOrderService.listVisible();
    if (!res.success) {
      const errorText = res.error || '加载客户订单失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.setData({
        customerOrdersList: [],
        allCustomerOrdersList: [],
        roleScopeText: errorText,
        canCreateCustomerOrder: this.canCreateCustomerOrder(),
        saveModeText: '',
        isLoggedIn: Boolean(profile),
        canUseBusiness: true,
        accessStateText: AuthService.getAccessStateText(profile),
        isLoading: false,
        loadErrorText: errorText,
      });
      return;
    }

    const orders = res.data || [];
    this.setData({
      allCustomerOrdersList: orders,
      customerOrdersList: this.filterOrdersByStatus(orders, this.data.currentStatus),
      roleScopeText: this.getRoleScopeText(res.meta),
      canCreateCustomerOrder: this.canCreateCustomerOrder(),
      saveModeText: AuthService.getCurrentProfile() ? getSaveModeText(res.meta) : '',
      isLoggedIn: Boolean(AuthService.getCurrentProfile()),
      canUseBusiness: true,
      accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
      isLoading: false,
      loadErrorText: '',
    });
  },

  filterOrdersByStatus(list = [], status = -1) {
    const statusValue = Number(status);
    if (statusValue < 0) return list;
    return list.filter(order => Number(order.status) === statusValue);
  },

  onStatusChange(e) {
    const status = Number(e.detail.value);
    this.setData({
      currentStatus: status,
      customerOrdersList: this.filterOrdersByStatus(this.data.allCustomerOrdersList, status),
      loadErrorText: '',
    });
  },

  canCreateCustomerOrder() {
    return canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.CUSTOMER_ORDER_CREATE);
  },

  onLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  getRoleScopeText(meta = {}) {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) return AuthService.getAccessStateText(profile);
    const role = meta.role || (profile && profile.role);
    return getRoleScopeText({ ...profile, role }, FEATURE_KEYS.CUSTOMER_ORDERS);
  },

  async goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const res = await CustomerOrderService.getById(id);
    const item = res.success ? res.data : null;

    if (!item) {
      wx.showModal({
        title: '客户订单',
        content: res.error || '未找到订单资料。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    const productLines = (item.items || item.productList || [])
      .map(product => `${product.title || `商品 #${product.productId}`} x ${product.amount || product.quantity}：￥${product.totalPrice}`)
      .join('\n');
    const historyLines = (item.paymentHistory || [])
      .map(history => [
        history.createdAt || '',
        history.actorRole ? `操作者：${history.actorRole}` : '',
        history.toStatus !== undefined ? `状态：${MEMBER_ORDER_STATUS_TEXT[history.toStatus] || history.toStatus}` : '',
        history.note || '',
      ].filter(Boolean).join('｜'))
      .join('\n');
    const paymentInfo = [
      item.paymentMethod ? `付款方式：${item.paymentMethod}` : '',
      item.paymentRemark ? `付款备注：${item.paymentRemark}` : '',
      item.paymentProofUrls && item.paymentProofUrls.length ? `付款凭证：${item.paymentProofUrls.length} 张` : '',
      item.confirmedAmount ? `实收金额：￥${item.confirmedAmount}` : '',
      item.confirmRemark ? `确认备注：${item.confirmRemark}` : '',
    ].filter(Boolean).join('\n');

    wx.showModal({
      title: item.title || '客户订单',
      content: `状态：${item.statusText}\n客户：${item.customerName}\n金额：￥${item.totalPrice}\n${paymentInfo || '暂无付款备注'}\n商品：\n${productLines || '暂无商品'}\n状态记录：\n${historyLines || '暂无记录'}\n${this.data.saveModeText}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onOrderAction(e) {
    const { id } = e.currentTarget.dataset;
    const order = this.data.customerOrdersList.find(item => String(item.id) === String(id));
    if (!order) {
      wx.showToast({ title: '未找到订单资料', icon: 'none' });
      return;
    }

    const profile = AuthService.getCurrentProfile();
    const isCustomer = profile && profile.role === 'customer';
    const isGuideOrAdmin = profile && ['guide', 'owner', 'admin'].includes(profile.role);
    const actions = [];

    if (isCustomer && Number(order.status) === 0) actions.push({ label: '声明已付款', action: 'declarePaid' });
    if (isCustomer && Number(order.status) !== 2 && Number(order.status) !== 3) actions.push({ label: '取消订单', action: 'cancelOrder' });
    if (isGuideOrAdmin && Number(order.status) === 1) actions.push({ label: '确认收款', action: 'confirmPayment' });
    if (isGuideOrAdmin && Number(order.status) !== 2 && Number(order.status) !== 3) actions.push({ label: '取消订单', action: 'cancelOrder' });

    if (actions.length === 0) {
      wx.showToast({ title: '当前订单暂无可执行操作', icon: 'none' });
      return;
    }

    wx.showActionSheet({
      itemList: actions.map(item => item.label),
      success: (res) => {
        const selected = actions[res.tapIndex];
        if (selected) this.openActionPanel(id, selected.action);
      }
    });
  },

  openActionPanel(id, action) {
    const panelConfig = {
      declarePaid: { title: '声明已付款', submitText: '提交付款资料' },
      confirmPayment: { title: '确认收款', submitText: '确认收款' },
      cancelOrder: { title: '取消订单', submitText: '确认取消' },
    };
    const config = panelConfig[action];
    if (!config) return;

    this.setData({
      actionPanelVisible: true,
      actionType: action,
      actionOrderId: id,
      actionPanelTitle: config.title,
      actionSubmitText: config.submitText,
      isSubmittingAction: false,
      actionForm: {
        paymentMethod: '',
        paymentRemark: '',
        paymentProofUrls: [],
        confirmedAmount: '',
        confirmRemark: '',
        cancelRemark: '',
      },
    });
  },

  closeActionPanel() {
    if (this.data.isSubmittingAction) return;
    this.setData({
      actionPanelVisible: false,
      actionType: '',
      actionOrderId: '',
      actionPanelTitle: '',
    });
  },

  stopPanelTap() {},

  onActionInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    if (!field) return;
    this.setData({ [`actionForm.${field}`]: value });
  },

  chooseActionPaymentProof() {
    if (this.data.isSubmittingAction) return;
    if (!wx.chooseMedia) {
      wx.showToast({ title: '当前设备不支持选择图片', icon: 'none' });
      return;
    }

    const currentUrls = this.data.actionForm.paymentProofUrls || [];
    const remainCount = 3 - currentUrls.length;
    if (remainCount <= 0) {
      wx.showToast({ title: '最多上传 3 张付款凭证', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      success: (res) => {
        const paths = (res.tempFiles || []).map(file => file.tempFilePath).filter(Boolean);
        if (!paths.length) {
          wx.showToast({ title: '未选择可用图片', icon: 'none' });
          return;
        }
        this.setData({
          'actionForm.paymentProofUrls': [...currentUrls, ...paths].slice(0, 3),
        });
      },
      fail: (err) => {
        const message = err && err.errMsg && err.errMsg.includes('cancel')
          ? '已取消选择图片'
          : '选择付款凭证失败，请重试';
        wx.showToast({ title: message, icon: 'none' });
      },
    });
  },

  removeActionPaymentProof(e) {
    if (this.data.isSubmittingAction) return;
    const index = Number(e.currentTarget.dataset.index);
    const paymentProofUrls = (this.data.actionForm.paymentProofUrls || [])
      .filter((_, itemIndex) => itemIndex !== index);
    this.setData({ 'actionForm.paymentProofUrls': paymentProofUrls });
  },

  previewActionPaymentProof(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const urls = this.data.actionForm.paymentProofUrls || [];
    if (!urls.length) return;
    wx.previewImage({
      current: urls[index] || urls[0],
      urls,
    });
  },

  previewOrderPaymentProof(e) {
    const { id } = e.currentTarget.dataset;
    const order = [...this.data.customerOrdersList, ...this.data.allCustomerOrdersList]
      .find(item => String(item.id) === String(id));
    const urls = order && Array.isArray(order.paymentProofUrls) ? order.paymentProofUrls : [];
    if (!urls.length) {
      wx.showToast({ title: '当前订单没有付款凭证', icon: 'none' });
      return;
    }
    wx.previewImage({
      current: urls[0],
      urls,
    });
  },

  getActionOrder() {
    const { actionOrderId, customerOrdersList, allCustomerOrdersList } = this.data;
    return [...customerOrdersList, ...allCustomerOrdersList].find(item => String(item.id) === String(actionOrderId));
  },

  buildActionPayload() {
    const { actionType, actionForm } = this.data;
    const paymentMethod = String(actionForm.paymentMethod || '').trim();
    const paymentRemark = String(actionForm.paymentRemark || '').trim();
    const paymentProofUrls = actionForm.paymentProofUrls || [];
    const confirmedAmountText = String(actionForm.confirmedAmount || '').trim();
    const confirmRemark = String(actionForm.confirmRemark || '').trim();
    const cancelRemark = String(actionForm.cancelRemark || '').trim();

    if (actionType === 'declarePaid') {
      if (!paymentMethod) {
        return { error: '请填写付款方式' };
      }
      if (paymentProofUrls.length === 0) {
        return { error: '请上传付款凭证' };
      }
      return {
        data: {
          paymentMethod,
          paymentRemark,
          paymentProofUrls,
          note: `客户声明已付款：${[paymentMethod, paymentRemark, paymentProofUrls.length ? `凭证 ${paymentProofUrls.length} 张` : ''].filter(Boolean).join('｜')}`,
        },
      };
    }

    if (actionType === 'confirmPayment') {
      const confirmedAmount = Number(confirmedAmountText);
      const order = this.getActionOrder();
      const totalPrice = Number(order && order.totalPrice ? order.totalPrice : 0);
      if (!confirmedAmountText || Number.isNaN(confirmedAmount) || confirmedAmount <= 0) {
        return { error: '请填写有效实收金额' };
      }
      if (totalPrice > 0 && confirmedAmount > totalPrice) {
        return { error: '实收金额不能超过订单金额' };
      }
      return {
        data: {
          confirmedAmount,
          confirmRemark,
          note: `导游确认收款：实收 ¥${confirmedAmount}${confirmRemark ? `｜${confirmRemark}` : ''}`,
        },
      };
    }

    if (actionType === 'cancelOrder') {
      return {
        data: {
          cancelRemark,
          note: cancelRemark ? `订单已取消：${cancelRemark}` : '订单已取消',
        },
      };
    }

    return { error: '未知订单操作' };
  },

  async submitActionPanel() {
    const { actionOrderId, actionType, isSubmittingAction } = this.data;
    if (isSubmittingAction) return;

    const actionPayload = this.buildActionPayload();
    if (actionPayload.error) {
      wx.showToast({ title: actionPayload.error, icon: 'none' });
      return;
    }

    await this.runOrderAction(actionOrderId, actionType, actionPayload.data);
  },

  async runOrderAction(id, action, actionPayload = {}) {
    const actionMap = {
      declarePaid: CustomerOrderService.declarePaid,
      confirmPayment: CustomerOrderService.confirmPayment,
      cancelOrder: CustomerOrderService.cancelOrder,
    };
    const runner = actionMap[action];
    if (!runner) return;

    this.setData({ isSubmittingAction: true });

    const res = await runner(id, actionPayload);
    if (!res.success) {
      this.setData({ isSubmittingAction: false });
      wx.showToast({ title: res.error || '操作失败', icon: 'none' });
      return;
    }

    await this.loadQaOrders();
    this.setData({
      actionPanelVisible: false,
      actionType: '',
      actionOrderId: '',
      actionPanelTitle: '',
      isSubmittingAction: false,
    });
    wx.showToast({ title: getSaveModeText(res.meta), icon: 'none' });
  },

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'customerOrders'
      });
    }
    this.loadQaOrders();
  },

  onGoToEdit(e) {
    if (!this.canCreateCustomerOrder()) {
      wx.showToast({ title: '客户需通过团单分享入口下单', icon: 'none' });
      return;
    }

    const firstOrder = this.data.customerOrdersList[0];
    const groupOrderId = firstOrder && firstOrder.groupOrderId;
    const url = `/pages/customerOrders/edit/index${groupOrderId ? `?groupOrderId=${groupOrderId}` : ''}`;

    wx.navigateTo({
      url: url,
      fail: () => wx.showToast({ title: '打开订单表单失败', icon: 'none' }),
    });
  }
});
