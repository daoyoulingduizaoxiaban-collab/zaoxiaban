import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText, hasRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { getMemberOrderStatusList } from '~/enum/MemberOrderStatus';
import { consumeTabRouteQuery, navigateByUrl, parseRouteQuery } from '~/utils/navigation';

const MEMBER_ORDER_STATUS_TEXT = getMemberOrderStatusList()
  .reduce((map, item) => ({ ...map, [item.value]: item.label }), {});
const ROLE_TEXT = {
  customer: '客户',
  guide: '团主',
  owner: '产品拥有者',
  admin: '运营管理员',
  provider: '供应商',
};

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
    pendingOrderId: '',
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
      declaredAmount: '',
      confirmedAmount: '',
      confirmRemark: '',
      cancelRemark: '',
    },
  },

  getEmptyActionForm() {
    return {
      paymentMethod: '',
      paymentRemark: '',
      paymentProofUrls: [],
      declaredAmount: '',
      confirmedAmount: '',
      confirmRemark: '',
      cancelRemark: '',
    };
  },

  getAvailableOrderActions(order, profile = AuthService.getCurrentProfile()) {
    const isCustomer = profile && hasRole(profile, 'customer');
    const isGuideOrAdmin = profile && (hasRole(profile, 'guide') || isOwnerOrAdmin(profile));
    const status = Number(order && order.status);
    const actions = [];

    if (isCustomer && status === 0) actions.push({ label: '声明已付款', action: 'declarePaid' });
    if (isCustomer && status !== 2 && status !== 3) actions.push({ label: '取消订单', action: 'cancelOrder' });
    if (isGuideOrAdmin && status === 1) actions.push({ label: '确认收款', action: 'confirmPayment' });
    if (isGuideOrAdmin && status !== 2 && status !== 3) actions.push({ label: '取消订单', action: 'cancelOrder' });

    return actions;
  },

  decorateOrdersForAction(list = [], profile = AuthService.getCurrentProfile()) {
    return list.map(order => ({
      ...order,
      canHandle: this.getAvailableOrderActions(order, profile).length > 0,
    }));
  },

  resetActionState(extraState = {}) {
    this.setData({
      actionPanelVisible: false,
      actionType: '',
      actionOrderId: '',
      actionPanelTitle: '',
      actionSubmitText: '提交',
      isSubmittingAction: false,
      actionForm: this.getEmptyActionForm(),
      ...extraState,
    });
  },

  async onLoad(options = {}) {
    await AuthService.refreshSession();
    const pendingOrderId = options.orderId || options.id || '';
    this.setData({ pendingOrderId: pendingOrderId ? String(pendingOrderId) : '' });
    await this.loadQaOrders();
  },

  consumePendingRouteQuery() {
    const query = consumeTabRouteQuery('/pages/customerOrders/index');
    if (!query) return;
    const options = parseRouteQuery(query);
    const pendingOrderId = options.orderId || options.id || '';
    if (pendingOrderId) {
      this.setData({ pendingOrderId: String(pendingOrderId) });
    }
  },

  async loadQaOrders() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.CUSTOMER_ORDERS)) {
      const accessText = getRoleScopeText(profile, FEATURE_KEYS.CUSTOMER_ORDERS);
      this.resetActionState({
        customerOrdersList: [],
        allCustomerOrdersList: [],
        roleScopeText: accessText,
        canCreateCustomerOrder: false,
        saveModeText: '',
        isLoggedIn: Boolean(profile),
        canUseBusiness: false,
        accessStateText: accessText,
        isLoading: false,
        loadErrorText: '',
        pendingOrderId: '',
      });
      return;
    }

    this.setData({ isLoading: true, loadErrorText: '' });
    const res = await CustomerOrderService.listVisible();
    if (!res.success) {
      const errorText = res.error || '加载客户订单失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.resetActionState({
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

    const orders = this.decorateOrdersForAction(res.data || [], AuthService.getCurrentProfile());
    this.setData({
      allCustomerOrdersList: orders,
      customerOrdersList: this.filterOrdersByStatus(orders, this.data.currentStatus),
      roleScopeText: this.getRoleScopeText(res.meta),
      canCreateCustomerOrder: this.canCreateCustomerOrder() && orders.some(order => order.groupOrderId),
      saveModeText: AuthService.getCurrentProfile() ? getSaveModeText(res.meta) : '',
      isLoggedIn: Boolean(AuthService.getCurrentProfile()),
      canUseBusiness: true,
      accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
      isLoading: false,
      loadErrorText: '',
    });
    this.openPendingOrderDetail();
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
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/customerOrders/index')}`, {
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
    await this.openOrderDetailById(id);
  },

  async openPendingOrderDetail() {
    const id = this.data.pendingOrderId;
    if (!id || this.data.loadErrorText || !this.data.canUseBusiness) return;
    this.setData({ pendingOrderId: '' });
    await this.openOrderDetailById(id);
  },

  async openOrderDetailById(id) {
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
      .map(product => `${product.title || '商品资料'} x ${product.amount || product.quantity}：￥${product.totalPrice}`)
      .join('\n');
    const historyLines = (item.paymentHistory || [])
      .map(history => [
        history.createdAt || '',
        (history.actorName || history.actorRole) ? `操作者：${[history.actorName, ROLE_TEXT[history.actorRole] || history.actorRole].filter(Boolean).join(' / ')}` : '',
        history.toStatus !== undefined ? `状态：${MEMBER_ORDER_STATUS_TEXT[history.toStatus] || history.toStatus}` : '',
        Number(history.amount || 0) > 0 ? `金额：￥${history.amount}` : '',
        history.paymentMethod ? `方式：${history.paymentMethod}` : '',
        Number(history.proofCount || 0) > 0 ? `凭证：${history.proofCount} 张` : '',
        history.note || '',
      ].filter(Boolean).join('｜'))
      .join('\n');
    const paymentInfo = [
      item.paymentMethod ? `付款方式：${item.paymentMethod}` : '',
      item.paymentRemark ? `付款备注：${item.paymentRemark}` : '',
      item.paymentProofUrls && item.paymentProofUrls.length ? `付款凭证：${item.paymentProofUrls.length} 张` : '',
      item.declaredAmount ? `申报金额：￥${item.declaredAmount}` : '',
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

    const actions = this.getAvailableOrderActions(order);

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

    const order = [...this.data.customerOrdersList, ...this.data.allCustomerOrdersList]
      .find(item => String(item.id) === String(id));
    const actionForm = this.getEmptyActionForm();
    if (action === 'declarePaid' && order) {
      actionForm.declaredAmount = String(order.totalPrice || '');
    }
    if (action === 'confirmPayment' && order) {
      actionForm.confirmedAmount = String(order.declaredAmount || order.totalPrice || '');
    }

    this.setData({
      actionPanelVisible: true,
      actionType: action,
      actionOrderId: id,
      actionPanelTitle: config.title,
      actionSubmitText: config.submitText,
      isSubmittingAction: false,
      actionForm,
    });
  },

  closeActionPanel() {
    if (this.data.isSubmittingAction) return;
    this.resetActionState();
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
      wx.showToast({ title: '暂时无法选择图片，请稍后重试', icon: 'none' });
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
      fail: () => wx.showToast({ title: '付款凭证预览失败', icon: 'none' }),
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
      fail: () => wx.showToast({ title: '付款凭证预览失败', icon: 'none' }),
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
    const declaredAmountText = String(actionForm.declaredAmount || '').trim();
    const confirmedAmountText = String(actionForm.confirmedAmount || '').trim();
    const confirmRemark = String(actionForm.confirmRemark || '').trim();
    const cancelRemark = String(actionForm.cancelRemark || '').trim();

    if (actionType === 'declarePaid') {
      const declaredAmount = Number(declaredAmountText);
      const order = this.getActionOrder();
      const totalPrice = Number(order && order.totalPrice ? order.totalPrice : 0);
      if (!declaredAmountText || Number.isNaN(declaredAmount) || declaredAmount <= 0) {
        return { error: '请填写有效付款金额' };
      }
      if (totalPrice > 0 && declaredAmount > totalPrice) {
        return { error: '付款金额不能超过订单金额' };
      }
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
          declaredAmount,
          note: `客户声明已付款：￥${declaredAmount}｜${[paymentMethod, paymentRemark, paymentProofUrls.length ? `凭证 ${paymentProofUrls.length} 张` : ''].filter(Boolean).join('｜')}`,
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
          note: `团主确认收款：实收 ¥${confirmedAmount}${confirmRemark ? `｜${confirmRemark}` : ''}`,
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
    if (!actionOrderId || !this.getActionOrder()) {
      wx.showToast({ title: '未找到订单资料，请重新进入后再操作', icon: 'none' });
      return;
    }

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
    this.resetActionState();
    wx.showToast({ title: getSaveModeText(res.meta), icon: 'none' });
  },

  async onShow() {
    await AuthService.refreshSession();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'customerOrders'
      });
    }
    this.consumePendingRouteQuery();
    await this.loadQaOrders();
  },

  onGoToEdit(e) {
    if (!this.canCreateCustomerOrder()) {
      wx.showToast({ title: '客户需通过团单分享入口下单', icon: 'none' });
      return;
    }

    const firstOrder = this.data.allCustomerOrdersList.find(order => order.groupOrderId);
    const groupOrderId = firstOrder && firstOrder.groupOrderId;
    if (!groupOrderId) {
      wx.showToast({ title: '请从有效团单进入客户下单', icon: 'none' });
      return;
    }
    const url = `/pages/customerOrders/edit/index${groupOrderId ? `?groupOrderId=${groupOrderId}` : ''}`;

    navigateByUrl(url, {
      fail: () => wx.showToast({ title: '打开订单表单失败', icon: 'none' }),
    });
  }
});
