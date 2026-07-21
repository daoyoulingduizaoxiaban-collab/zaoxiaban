import { AuthService } from '~/services/auth/authService';
import { OperationLogService, OPERATION_LOG_FILTERS } from '~/services/operationLog/operationLogService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';

Page({
  data: {
    filters: OPERATION_LOG_FILTERS,
    currentType: 'all',
    logs: [],
    // 统一三态：loading / ready / error / empty
    pageState: 'loading',
    stateText: '',
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
        pageState: 'empty',
        stateText: getRoleScopeText(profile, FEATURE_KEYS.OPERATION_LOGS),
      });
      return;
    }
    this.setData({ pageState: 'loading', stateText: '' });
    const res = await OperationLogService.listVisible({ type: this.data.currentType });
    if (!res.success) {
      this.setData({ logs: [], pageState: 'error', stateText: res.error || '读取操作记录失败' });
      return;
    }
    const logs = res.data || [];
    this.setData({
      logs,
      pageState: logs.length ? 'ready' : 'empty',
      stateText: logs.length ? '' : '暂无操作记录',
    });
  },

  onTypeChange(e) {
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    this.setData({ currentType: value || 'all' }, () => this.loadLogs());
  },
});
