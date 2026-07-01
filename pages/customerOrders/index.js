import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';

Page({
  data: {
    titleText: '客户订单',
    customerOrdersList: [],
    roleScopeText: '',
    canCreateCustomerOrder: false,
    saveModeText: '本地/QA 展示模式，尚未正式保存到云端',
  },

  onLoad() {
    this.loadQaOrders();
  },

  async loadQaOrders() {
    const res = await CustomerOrderService.listVisible();
    if (!res.success) {
      wx.showToast({ title: res.error || '加载客户订单失败', icon: 'none' });
      return;
    }

    this.setData({
      customerOrdersList: res.data,
      roleScopeText: this.getRoleScopeText(),
      canCreateCustomerOrder: this.canCreateCustomerOrder(),
    });
  },

  canCreateCustomerOrder() {
    const profile = AuthService.getCurrentProfile();
    return Boolean(profile && (profile.role === 'customer' || profile.role === 'owner' || profile.role === 'admin'));
  },

  getRoleScopeText() {
    const profile = AuthService.getCurrentProfile();
    if (!profile) return '未登录，仅显示空列表';
    if (profile.role === 'guide') return '仅显示你管理团单下的客户订单';
    if (profile.role === 'customer') return '仅显示你自己的客户订单';
    if (profile.role === 'owner' || profile.role === 'admin') return '当前为管理角色，可查看 QA 范围内客户订单';
    return '当前角色暂无客户订单权限';
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
      .map(history => `${history.createdAt || ''} ${history.note || ''}`)
      .join('\n');

    wx.showModal({
      title: item.title || '客户订单',
      content: `状态：${item.statusText}\n客户：${item.customerName}\n金额：￥${item.totalPrice}\n商品：\n${productLines || '暂无商品'}\n状态记录：\n${historyLines || '暂无记录'}\n${this.data.saveModeText}`,
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
        if (selected) this.runOrderAction(id, selected.action);
      }
    });
  },

  async runOrderAction(id, action) {
    const actionMap = {
      declarePaid: CustomerOrderService.declarePaid,
      confirmPayment: CustomerOrderService.confirmPayment,
      cancelOrder: CustomerOrderService.cancelOrder,
    };
    const runner = actionMap[action];
    if (!runner) return;

    const res = await runner(id);
    if (!res.success) {
      wx.showToast({ title: res.error || '操作失败', icon: 'none' });
      return;
    }

    await this.loadQaOrders();
    wx.showToast({ title: this.data.saveModeText, icon: 'none' });
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

    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    const firstOrder = this.data.customerOrdersList[0];
    const groupOrderId = firstOrder && firstOrder.groupOrderId;
    const url = id
      ? `/pages/customerOrders/edit/index?id=${id}`
      : `/pages/customerOrders/edit/index${groupOrderId ? `?groupOrderId=${groupOrderId}` : ''}`;

    wx.navigateTo({
      url: url,
      fail: (err) => {
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({ url });
        } else {
          wx.showToast({ title: '打开订单表单失败', icon: 'none' });
        }
      }
    });
  }
});
