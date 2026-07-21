import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';

// 清零态：每次返回新对象，避免共享引用被意外改写。
const emptySummaryList = () => [
  { name: '团单', number: 0 },
  { name: '客户订单', number: 0 },
  { name: '待确认收款', number: 0 },
  { name: '已确认收款', number: 0 },
];
const emptyFinanceSummary = () => ({ receivable: 0, received: 0 });

Page({
  data: {
    summaryList: emptySummaryList(),
    financeSummary: emptyFinanceSummary(),
    dataModeText: '读取中',
    // 统一三态：loading / ready / error / empty
    pageState: 'loading',
    stateText: '',
  },

  async onShow() {
    await AuthService.refreshSession();
    this.loadSummary();
  },

  async loadSummary() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.DATA_CENTER)) {
      this.setData({
        summaryList: emptySummaryList(),
        financeSummary: emptyFinanceSummary(),
        dataModeText: AuthService.getAccessStateText(profile),
        pageState: 'empty',
        stateText: AuthService.getAccessStateText(profile),
      });
      return;
    }

    this.setData({ pageState: 'loading', stateText: '', dataModeText: '读取中' });
    const [groupOrderRes, customerOrderRes] = await Promise.all([
      GroupOrderService.listVisible(),
      CustomerOrderService.listVisible(),
    ]);
    const failed = [groupOrderRes, customerOrderRes].find(res => !res.success);
    if (failed) {
      this.setData({
        summaryList: emptySummaryList(),
        financeSummary: emptyFinanceSummary(),
        dataModeText: failed.error || '资料读取失败',
        pageState: 'error',
        stateText: failed.error || '资料读取失败，请稍后重试',
      });
      return;
    }

    const orders = this.mergeCustomerOrders(customerOrderRes.data || [], groupOrderRes.data || []);
    const activeOrders = orders.filter(order => Number(order.status) !== 3);
    const confirmedOrders = orders.filter(order => Number(order.status) === 2);
    this.setData({
      summaryList: [
        { name: '团单', number: groupOrderRes.data.length },
        { name: '客户订单', number: orders.length },
        { name: '待确认收款', number: orders.filter(order => Number(order.status) === 1).length },
        { name: '已确认收款', number: confirmedOrders.length },
      ],
      financeSummary: {
        receivable: activeOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
        received: confirmedOrders.reduce((sum, order) => sum + Number(order.confirmedAmount || order.totalPrice || 0), 0),
      },
      dataModeText: getSaveModeText(groupOrderRes.meta),
      pageState: 'ready',
      stateText: '',
    });
  },

  mergeCustomerOrders(customerOrders = [], groupOrders = []) {
    const map = new Map();
    customerOrders.forEach((order) => {
      const key = String(order.id || `${order.groupOrderId}-${order.customerName}-${order.totalPrice}`);
      map.set(key, order);
    });
    groupOrders.forEach((groupOrder) => {
      (groupOrder.memberOrderList || []).forEach((order, index) => {
        const key = String(order.id || `${groupOrder.id}-${index}-${order.customerName || ''}`);
        if (!map.has(key)) {
          map.set(key, {
            ...order,
            id: key,
            groupOrderId: groupOrder.id,
            groupOrderTitle: groupOrder.title,
          });
        }
      });
    });
    return Array.from(map.values());
  },
});
