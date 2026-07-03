import { DirectoryRepository } from '~/repositories/directoryRepository';
import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, REVIEW_ROLE_OPTIONS, REVIEW_STATUS, isOwnerOrAdmin } from '~/services/auth/roleScope';

Page({
  data: {
    titleText: '用户审核',
    users: [],
    roleOptions: REVIEW_ROLE_OPTIONS,
    canReview: false,
    selectedRoleById: {},
    isLoading: false,
    loadErrorText: '',
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const profile = AuthService.getCurrentProfile();
    const canReview = isOwnerOrAdmin(profile);
    this.setData({ canReview });
    if (!canReview) {
      this.setData({
        users: [],
        selectedRoleById: {},
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
        selectedRoleById: {},
        loadErrorText: errorText,
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }
    const selectedRoleById = {};
    (res.data || []).forEach((user) => {
      selectedRoleById[user.id || user._id] = user.requestedRole || user.role || AUTH_ROLES.CUSTOMER;
    });
    this.setData({ users: res.data || [], selectedRoleById, loadErrorText: '' });
  },

  onRoleChange(e) {
    const { id, role } = e.currentTarget.dataset;
    if (!id || !role) return;
    this.setData({ [`selectedRoleById.${id}`]: role });
  },

  async reviewUser(e) {
    if (!this.data.canReview || !isOwnerOrAdmin(AuthService.getCurrentProfile())) {
      wx.showToast({ title: '当前账号没有用户审核权限', icon: 'none' });
      return;
    }
    const { id, status } = e.currentTarget.dataset;
    if (!id || !status) return;
    const role = this.data.selectedRoleById[id] || AUTH_ROLES.CUSTOMER;
    const res = await DirectoryRepository.reviewUser({
      id,
      reviewStatus: status,
      role,
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
