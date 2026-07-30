import { AuthService } from '~/services/auth/authService';
import { useAccessPage } from '~/behaviors/useAccessPage';
import { OperationLogService, OPERATION_LOG_FILTERS } from '~/services/operationLog/operationLogService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';

const PAGE_SIZE = 20;

Page({
  behaviors: [useAccessPage],
  data: {
    filters: OPERATION_LOG_FILTERS,
    currentType: 'all',
    startDate: '',
    endDate: '',
    logs: [],
    page: 1,
    pageSize: PAGE_SIZE,
    hasMore: false,
    loadingMore: false,
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

  // append=false：筛选/首屏，重置到第 1 页并替换；append=true：加载更多，页码 +1 并追加。
  async loadLogs({ append = false } = {}) {
    await AuthService.refreshSession();
    if ((this as any).requireLogin()) return;
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.OPERATION_LOGS)) {
      this.setData({
        logs: [],
        hasMore: false,
        pageState: 'empty',
        stateText: getRoleScopeText(profile, FEATURE_KEYS.OPERATION_LOGS),
      });
      return;
    }

    const nextPage = append ? this.data.page + 1 : 1;
    if (append) this.setData({ loadingMore: true });
    else this.setData({ pageState: 'loading', stateText: '' });

    const res = await OperationLogService.listVisible({
      type: this.data.currentType,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      page: nextPage,
      pageSize: this.data.pageSize,
    });

    if (!res.success) {
      if (append) {
        this.setData({ loadingMore: false });
        wx.showToast({ title: res.error || '加载更多失败', icon: 'none' });
      } else {
        this.setData({ logs: [], hasMore: false, pageState: 'error', stateText: res.error || '读取操作记录失败' });
      }
      return;
    }

    const pageData = res.data || [];
    const logs = append ? [...this.data.logs, ...pageData] : pageData;
    this.setData({
      logs,
      page: nextPage,
      hasMore: Boolean(res.meta && res.meta.hasMore),
      loadingMore: false,
      pageState: logs.length ? 'ready' : 'empty',
      stateText: logs.length ? '' : '暂无操作记录',
    });
  },

  onTypeChange(e) {
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    this.setData({ currentType: value || 'all' }, () => this.loadLogs());
  },

  onStartDateChange(e) {
    const startDate = e.detail.value;
    if (startDate && this.data.endDate && startDate > this.data.endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }
    this.setData({ startDate }, () => this.loadLogs());
  },

  onEndDateChange(e) {
    const endDate = e.detail.value;
    if (endDate && this.data.startDate && endDate < this.data.startDate) {
      wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }
    this.setData({ endDate }, () => this.loadLogs());
  },

  onClearDate() {
    if (!this.data.startDate && !this.data.endDate) return;
    this.setData({ startDate: '', endDate: '' }, () => this.loadLogs());
  },

  onLoadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.loadLogs({ append: true });
  },
});
