import { DirectoryRepository } from '~/repositories/directoryRepository';
import { AuthService } from '~/services/auth/authService';
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
  data: {
    titleText: '用户审核',
    users: [],
    roleOptions: REVIEW_ROLE_OPTIONS,
    canReview: false,
    selectedRolesById: {},
    roleExpiresAtById: {},
    isLoading: false,
    loadErrorText: '',
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
    const profile = AuthService.getCurrentProfile();
    const canReview = isOwnerOrAdmin(profile);
    this.setData({ canReview });
    if (!canReview) {
      this.setData({
        users: [],
        selectedRolesById: {},
        roleExpiresAtById: {},
        isLoading: false,
        loadErrorText: '',
      });
      return;
    }

    this.setData({ isLoading: true, loadErrorText: '' });
    const res = await DirectoryRepository.listPendingUsers();
    this.setData({ isLoading: false });
    if (!res.success) {
      const errorText = res.error || '加载审核列表失败';
      this.setData({
        users: [],
        selectedRolesById: {},
        roleExpiresAtById: {},
        loadErrorText: errorText,
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
    this.setData({ users, selectedRolesById, roleExpiresAtById, loadErrorText: '' });
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

  onExpiresAtInput(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    this.setData({ [`roleExpiresAtById.${id}`]: e.detail.value || '' });
  },

  async reviewUser(e) {
    if (!this.data.canReview || !isOwnerOrAdmin(AuthService.getCurrentProfile())) {
      wx.showToast({ title: '当前账号没有用户审核权限', icon: 'none' });
      return;
    }
    const { id, status } = e.currentTarget.dataset;
    if (!id || !status) return;
    const roles = normalizeSelectedRoles(this.data.selectedRolesById[id] || [], AUTH_ROLES.CUSTOMER);
    const res = await DirectoryRepository.reviewUser({
      id,
      reviewStatus: status,
      role: roles[0],
      roles,
      roleExpiresAt: this.data.roleExpiresAtById[id] || '',
      reviewRemark: status === REVIEW_STATUS.APPROVED ? '审核通过' : '审核未通过',
    });
    if (!res.success) {
      wx.showToast({ title: res.error || '审核操作失败', icon: 'none' });
      return;
    }
    wx.showToast({ title: '审核已更新', icon: 'success' });
    this.refresh();
  },
});
