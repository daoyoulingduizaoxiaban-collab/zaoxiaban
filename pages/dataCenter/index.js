import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, isOwnerOrAdmin } from '~/services/auth/roleScope';

const canViewDataCenter = profile => Boolean(
  profile && (
    profile.role === AUTH_ROLES.GUIDE
    || profile.role === AUTH_ROLES.CUSTOMER
    || isOwnerOrAdmin(profile)
  )
);

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
    if (!canViewDataCenter(profile)) {
      this.setData({
        summaryList: [
          { name: '团单', number: 0 },
          { name: '客户订单', number: 0 },
        ],
        dataModeText: '当前账号没有数据中心查看权限。',
        disabledReason: '当前账号没有数据中心查看权限。',
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
