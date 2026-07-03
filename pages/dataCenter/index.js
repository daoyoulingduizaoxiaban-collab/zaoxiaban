import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';

Page({
  data: {
    summaryList: [
      { name: '团单', number: 0 },
      { name: '客户订单', number: 0 },
      { name: '待确认收款', number: 0 },
      { name: '已确认收款', number: 0 },
    ],
    financeSummary: {
      receivable: 0,
      received: 0,
    },
    dataModeText: '读取中',
    disabledReason: '',
    isLoading: false,
  },

  async onShow() {
    await AuthService.refreshSession();
    this.loadSummary();
  },

  async loadSummary() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.DATA_CENTER)) {
      this.setData({
        summaryList: [
          { name: '团单', number: 0 },
          { name: '客户订单', number: 0 },
          { name: '待确认收款', number: 0 },
          { name: '已确认收款', number: 0 },
        ],
        financeSummary: { receivable: 0, received: 0 },
        dataModeText: AuthService.getAccessStateText(profile),
        disabledReason: AuthService.getAccessStateText(profile),
        isLoading: false,
      });
      return;
    }

    this.setData({ isLoading: true, disabledReason: '', dataModeText: '读取中' });
    const [groupOrderRes, customerOrderRes] = await Promise.all([
      GroupOrderService.listVisible(),
      CustomerOrderService.listVisible(),
    ]);
    const failed = [groupOrderRes, customerOrderRes].find(res => !res.success);
    if (failed) {
      this.setData({
        summaryList: [
          { name: '团单', number: 0 },
          { name: '客户订单', number: 0 },
          { name: '待确认收款', number: 0 },
          { name: '已确认收款', number: 0 },
        ],
        financeSummary: { receivable: 0, received: 0 },
        dataModeText: failed.error || '资料读取失败',
        disabledReason: failed.error || '资料读取失败，请稍后重试',
        isLoading: false,
      });
      return;
    }

    const orders = customerOrderRes.data || [];
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
      disabledReason: '',
      isLoading: false,
    });
  },
});
