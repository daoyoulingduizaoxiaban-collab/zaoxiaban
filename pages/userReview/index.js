import { DirectoryRepository } from '~/repositories/directoryRepository';
import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, isOwnerOrAdmin, REVIEW_STATUS } from '~/services/auth/roleScope';

Page({
  data: {
    titleText: '用户审核',
    users: [],
    roleOptions: [
      { label: '导游/领队', value: AUTH_ROLES.GUIDE },
      { label: '客户', value: AUTH_ROLES.CUSTOMER },
      { label: '供应商', value: AUTH_ROLES.PROVIDER },
      { label: '运营管理员', value: AUTH_ROLES.ADMIN },
    ],
    canReview: false,
    selectedRoleById: {},
    isLoading: false,
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
    if (!canReview) return;

    this.setData({ isLoading: true });
    const res = await DirectoryRepository.listPendingUsers();
    this.setData({ isLoading: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '加载审核列表失败', icon: 'none' });
      return;
    }
    const selectedRoleById = {};
    (res.data || []).forEach((user) => {
      selectedRoleById[user.id || user._id] = user.requestedRole || user.role || AUTH_ROLES.CUSTOMER;
    });
    this.setData({ users: res.data || [], selectedRoleById });
  },

  onRoleChange(e) {
    const { id, role } = e.currentTarget.dataset;
    if (!id || !role) return;
    this.setData({ [`selectedRoleById.${id}`]: role });
  },

  async reviewUser(e) {
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
