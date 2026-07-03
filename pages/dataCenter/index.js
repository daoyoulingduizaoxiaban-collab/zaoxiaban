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
    ],
    dataModeText: '读取中',
    disabledReason: '',
  },

  onLoad() {
    this.loadSummary();
  },

  async loadSummary() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.DATA_CENTER)) {
      this.setData({
        summaryList: [
          { name: '团单', number: 0 },
          { name: '客户订单', number: 0 },
        ],
        dataModeText: AuthService.getAccessStateText(profile),
        disabledReason: AuthService.getAccessStateText(profile),
      });
      return;
    }

    const [groupOrderRes, customerOrderRes] = await Promise.all([
      GroupOrderService.listVisible(),
      CustomerOrderService.listVisible(),
    ]);

    this.setData({
      summaryList: [
        { name: '团单', number: groupOrderRes.success ? groupOrderRes.data.length : 0 },
        { name: '客户订单', number: customerOrderRes.success ? customerOrderRes.data.length : 0 },
      ],
      dataModeText: getSaveModeText(groupOrderRes.meta),
      disabledReason: '',
    });
  },
});
