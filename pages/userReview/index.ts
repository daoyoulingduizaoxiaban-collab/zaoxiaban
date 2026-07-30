import { DirectoryRepository } from '~/repositories/directoryRepository';
import { AuthService } from '~/services/auth/authService';
import { useAccessPage } from '~/behaviors/useAccessPage';
import { AUTH_ROLES, REVIEW_ROLE_OPTIONS, REVIEW_STATUS, isOwnerOrAdmin } from '~/services/auth/roleScope';

const roleLabelByValue = REVIEW_ROLE_OPTIONS.reduce((map, item) => ({
  ...map,
  [item.value]: item.label,
}), {});

const statusLabelByValue = {
  [REVIEW_STATUS.PENDING]: '待审核',
  [REVIEW_STATUS.APPROVED]: '已通过',
  [REVIEW_STATUS.REJECTED]: '已拒绝',
  [REVIEW_STATUS.DISABLED]: '已停用',
};

const normalizeSelectedRoles = (roles, fallbackRole = AUTH_ROLES.CUSTOMER) => {
  const rawRoles = Array.isArray(roles) ? roles : [fallbackRole];
  return [...new Set(rawRoles.filter(role => REVIEW_ROLE_OPTIONS.some(item => item.value === role)))];
};

const buildReviewRoleOptions = selectedRoles => REVIEW_ROLE_OPTIONS.map(item => ({
  ...item,
  selected: selectedRoles.includes(item.value),
}));

Page({
  behaviors: [useAccessPage],
  data: {
    titleText: '用户目录',
    users: [],
    allUsers: [],
    // 视图：all=全部用户 / pending=仅待审核
    filterMode: 'all',
    pendingCount: 0,
    roleOptions: REVIEW_ROLE_OPTIONS,
    canReview: false,
    selectedRolesById: {},
    roleExpiresAtById: {},
    // 统一三态：loading / ready / error / empty
    pageState: 'loading',
    stateText: '',
    // 拒绝/停用二次确认弹窗
    reviewDialogVisible: false,
    reviewDialogTitle: '',
    reviewReason: '',
    pendingReview: null,
  },

  async onLoad() {
    await AuthService.refreshSession();
    await this.refresh();
  },

  async onShow() {
    await AuthService.refreshSession();
    await this.refresh();
  },

  async refresh() {
    if ((this as any).requireLogin()) return;
    const profile = AuthService.getCurrentProfile();
    const canReview = isOwnerOrAdmin(profile);
    this.setData({ canReview });
    if (!canReview) {
      this.setData({
        users: [],
        selectedRolesById: {},
        roleExpiresAtById: {},
        pageState: 'empty',
        stateText: '当前账号没有用户审核权限',
      });
      return;
    }

    this.setData({ pageState: 'loading', stateText: '' });
    const res = await DirectoryRepository.listPendingUsers();
    if (!res.success) {
      const errorText = res.error || '加载审核列表失败';
      this.setData({
        users: [],
        selectedRolesById: {},
        roleExpiresAtById: {},
        pageState: 'error',
        stateText: errorText,
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }
    const selectedRolesById = {};
    const roleExpiresAtById = {};
    const users = (res.data || []).map((user) => {
      const requestedRole = user.requestedRole || user.role || AUTH_ROLES.CUSTOMER;
      const selectedRoles = normalizeSelectedRoles(user.roles, requestedRole);
      const id = user.id || user._id;
      selectedRolesById[id] = selectedRoles;
      roleExpiresAtById[id] = user.roleExpiresAt || user.rolesExpireAt || '';
      return {
        ...user,
        requestedRoleLabel: selectedRoles.map(role => roleLabelByValue[role] || role).join('、') || '客户',
        accountNote: `${statusLabelByValue[user.reviewStatus || user.status] || '待审核'}｜${user.openId ? '微信账号已登录' : '微信账号需确认'}`,
        reviewRoleOptions: buildReviewRoleOptions(selectedRoles),
        roleExpiresAt: roleExpiresAtById[id],
      };
    });
    const pendingCount = users.filter(user => String(user.reviewStatus || user.status) === REVIEW_STATUS.PENDING).length;
    this.setData({ allUsers: users, selectedRolesById, roleExpiresAtById, pendingCount });
    this.applyFilter();
  },

  // 按当前视图（全部 / 待审核）从 allUsers 过滤出要展示的列表；两个视图同一份数据源，保证地端云端口径一致。
  applyFilter() {
    const { filterMode, allUsers } = this.data;
    const users = filterMode === 'pending'
      ? allUsers.filter(user => String(user.reviewStatus || user.status) === REVIEW_STATUS.PENDING)
      : allUsers;
    this.setData({
      users,
      pageState: users.length ? 'ready' : 'empty',
      stateText: users.length ? '' : (filterMode === 'pending' ? '暂无待审核用户' : '暂无用户'),
    });
  },

  onFilterChange(e) {
    const { mode } = e.currentTarget.dataset;
    if (!mode || mode === this.data.filterMode) return;
    this.setData({ filterMode: mode });
    this.applyFilter();
  },

  onRoleToggle(e) {
    const { id, role } = e.currentTarget.dataset;
    if (!id || !role) return;
    const current = normalizeSelectedRoles(this.data.selectedRolesById[id] || [], '');
    const nextRoles = current.includes(role)
      ? current.filter(item => item !== role)
      : [...current, role];
    const safeRoles = nextRoles.length ? nextRoles : [role];
    const users = this.data.users.map(user => (
      String(user.id || user._id) === String(id)
        ? {
          ...user,
          requestedRoleLabel: safeRoles.map(item => roleLabelByValue[item] || item).join('、'),
          reviewRoleOptions: buildReviewRoleOptions(safeRoles),
        }
        : user
    ));
    this.setData({
      users,
      [`selectedRolesById.${id}`]: safeRoles,
    });
  },

  onExpiresAtChange(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    this.setData({ [`roleExpiresAtById.${id}`]: e.detail.value || '' });
  },

  onExpiresAtClear(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    this.setData({ [`roleExpiresAtById.${id}`]: '' });
  },

  // 提交审核结果（通过直接调用；拒绝/停用经二次确认后调用）
  async submitReview({ id, status, remark }) {
    if (!this.data.canReview || !isOwnerOrAdmin(AuthService.getCurrentProfile())) {
      wx.showToast({ title: '当前账号没有用户审核权限', icon: 'none' });
      return false;
    }
    // A14/A2：追加不覆盖——始终保留客户基线，绝不把 [customer,guide] 冲成 [guide]。
    const selected = normalizeSelectedRoles(this.data.selectedRolesById[id] || [], AUTH_ROLES.CUSTOMER);
    const roles = Array.from(new Set([AUTH_ROLES.CUSTOMER, ...selected]));
    const res = await DirectoryRepository.reviewUser({
      id,
      reviewStatus: status,
      role: roles[0],
      roles,
      roleExpiresAt: this.data.roleExpiresAtById[id] || '',
      reviewRemark: remark,
    });
    if (!res.success) {
      wx.showToast({ title: res.error || '审核操作失败', icon: 'none' });
      return false;
    }
    wx.showToast({ title: '审核已更新', icon: 'success' });
    this.refresh();
    return true;
  },

  // 通过：无需原因，直接执行
  approveUser(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    this.submitReview({ id, status: REVIEW_STATUS.APPROVED, remark: '审核通过' });
  },

  // 拒绝/停用：打开二次确认 + 必填原因弹窗
  openReviewDialog(e) {
    const { id, status } = e.currentTarget.dataset;
    if (!id || !status) return;
    const title = status === REVIEW_STATUS.REJECTED ? '拒绝该用户申请' : '停用该用户';
    this.setData({
      reviewDialogVisible: true,
      reviewDialogTitle: title,
      reviewReason: '',
      pendingReview: { id, status },
    });
  },

  onReasonInput(e) {
    this.setData({ reviewReason: e.detail.value || '' });
  },

  closeReviewDialog() {
    this.setData({ reviewDialogVisible: false, pendingReview: null, reviewReason: '' });
  },

  stopPropagation() {},

  async confirmReview() {
    const pending = this.data.pendingReview;
    if (!pending) return;
    const reason = String(this.data.reviewReason || '').trim();
    if (!reason) {
      wx.showToast({ title: '请填写原因后再提交', icon: 'none' });
      return;
    }
    const ok = await this.submitReview({ id: pending.id, status: pending.status, remark: reason });
    if (ok) this.closeReviewDialog();
  },
});
