import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';

Page({
  data: {
    summaryList: [
      { name: '团单', number: 0 },
      { name: '客户订单', number: 0 },
      { name: '本地模式', number: 'QA' },
    ],
  },

  onLoad() {
    this.loadSummary();
  },

  async loadSummary() {
    const [groupOrderRes, customerOrderRes] = await Promise.all([
      GroupOrderService.listVisible(),
      CustomerOrderService.listVisible(),
    ]);

    this.setData({
      summaryList: [
        { name: '团单', number: groupOrderRes.success ? groupOrderRes.data.length : 0 },
        { name: '客户订单', number: customerOrderRes.success ? customerOrderRes.data.length : 0 },
        { name: '本地模式', number: 'QA' },
      ],
    });
  },
});
