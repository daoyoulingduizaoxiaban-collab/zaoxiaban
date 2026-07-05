import { AuthService } from '~/services/auth/authService';
import { OperationLogService, OPERATION_LOG_FILTERS } from '~/services/operationLog/operationLogService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';

Page({
  data: {
    filters: OPERATION_LOG_FILTERS,
    currentType: 'all',
    logs: [],
    isLoading: true,
    disabledReason: '',
  },

  async onLoad() {
    await this.loadLogs();
  },

  async onShow() {
    await this.loadLogs();
  },

  async loadLogs() {
    await AuthService.refreshSession();
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.OPERATION_LOGS)) {
      this.setData({
        logs: [],
        isLoading: false,
        disabledReason: getRoleScopeText(profile, FEATURE_KEYS.OPERATION_LOGS),
      });
      return;
    }
    this.setData({ isLoading: true, disabledReason: '' });
    const res = await OperationLogService.listVisible({ type: this.data.currentType });
    this.setData({
      isLoading: false,
      logs: res.success ? (res.data || []) : [],
      disabledReason: res.success ? '' : (res.error || '读取操作记录失败'),
    });
  },

  onTypeChange(e) {
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    this.setData({ currentType: value || 'all' }, () => this.loadLogs());
  },
});
