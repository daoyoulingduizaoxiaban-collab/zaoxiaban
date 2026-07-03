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
    isLoading: false,
  },

  onShow() {
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
        ],
        dataModeText: failed.error || '资料读取失败',
        disabledReason: failed.error || '资料读取失败，请稍后重试',
        isLoading: false,
      });
      return;
    }

    this.setData({
      summaryList: [
        { name: '团单', number: groupOrderRes.data.length },
        { name: '客户订单', number: customerOrderRes.data.length },
      ],
      dataModeText: getSaveModeText(groupOrderRes.meta),
      disabledReason: '',
      isLoading: false,
    });
  },
});
