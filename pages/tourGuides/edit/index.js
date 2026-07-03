import { AuthService } from '~/services/auth/authService';
import {
  AUTH_ROLES,
  FEATURE_KEYS,
  REVIEW_STATUS,
  canUseFeature,
  isOwnerOrAdmin,
  normalizeReviewStatus,
} from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateBackOrTab } from '~/utils/navigation';

Page({
  data: {
    pageTitle: '新增导游/领队',
    isEdit: false,
    canSave: false,
    canEditStatus: false,
    disabledReason: '',
    pageErrorText: '',
    targetId: '',
    isSubmitting: false,
    isApplicationMode: false,
    submitText: '保存导游/领队',
    formData: {
      title: '',
      date: '',
      city: '',
      phone: '',
      statusText: '导游/领队'
    }
  },

  getEmptyFormData() {
    return {
      title: '',
      date: '',
      city: '',
      phone: '',
      statusText: '导游/领队'
    };
  },

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const reviewStatus = normalizeReviewStatus(profile && (profile.reviewStatus || profile.status));
    const isGuideApplicant = Boolean(profile && profile.requestedRole === AUTH_ROLES.GUIDE && reviewStatus === REVIEW_STATUS.PENDING);
    const isApplicationMode = Boolean(
      profile
      && profile.role === AUTH_ROLES.CUSTOMER
      && reviewStatus === REVIEW_STATUS.APPROVED
      && !isGuideApplicant
    );
    const targetId = options.id || (profile && (profile.role === AUTH_ROLES.GUIDE || isApplicationMode || isGuideApplicant) ? profile.id : '');
    const canSave = Boolean(isApplicationMode || (canUseFeature(profile, FEATURE_KEYS.TOUR_GUIDES) && (
      isOwnerOrAdmin(profile)
      || (profile.role === AUTH_ROLES.GUIDE && String(targetId) === String(profile.id))
    )));
    let disabledReason = '当前账号没有导游/领队资料维护权限。';
    if (canSave) disabledReason = '';
    if (isGuideApplicant) disabledReason = '导游/领队申请已提交，请等待管理员确认。';
    let pageTitle = '编辑导游/领队';
    if (isApplicationMode) pageTitle = '申请导游/领队';
    if (isGuideApplicant) pageTitle = '导游/领队申请';
    this.setData({
      pageTitle,
      canSave,
      isApplicationMode,
      submitText: isApplicationMode ? '提交导游/领队申请' : '保存导游/领队',
      canEditStatus: isOwnerOrAdmin(profile),
      disabledReason,
      pageErrorText: canSave ? '' : disabledReason,
      targetId,
      formData: canSave ? this.data.formData : this.getEmptyFormData(),
    });
    if (!canSave) return;
    if (targetId) {
      this.setData({
        isEdit: true,
      });
      if (isGuideApplicant) return;
      this.fetchtourGuidesDetail(targetId);
    }
  },

  async fetchtourGuidesDetail(id) {
    const res = await DirectoryRepository.getUserById(id);
    if (!res.success) {
      const errorText = res.error || '加载导游/领队资料失败';
      this.setData({
        pageErrorText: errorText,
        formData: this.getEmptyFormData(),
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }
    const user = res.data;
    this.setData({
      pageErrorText: '',
      'formData.title': user.name || user.displayName || '',
      'formData.date': (user.updatedAt || '').slice(0, 10),
      'formData.city': user.city || '',
      'formData.phone': user.phone || '',
      'formData.statusText': user.displayRole || user.roleLabel || user.role || '导游/领队',
    });
  },

  showDatePicker() {
    const today = new Date().toISOString().slice(0, 10);
    this.setData({ 'formData.date': today });
    wx.showToast({ title: '已填入今日维护日期', icon: 'none' });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : e.detail;
    if (!field) return;
    this.setData({ [`formData.${field}`]: value });
  },

  async onSave() {
    if (!this.data.canSave) {
      wx.showToast({ title: '当前账号没有保存权限', icon: 'none' });
      return;
    }
    if (this.data.pageErrorText) {
      wx.showToast({ title: this.data.pageErrorText, icon: 'none' });
      return;
    }
    if (!String(this.data.formData.title || '').trim()) {
      wx.showToast({ title: '请填写导游/领队名称', icon: 'none' });
      return;
    }
    const phone = String(this.data.formData.phone || '').trim();
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入 11 位中国大陆手机号', icon: 'none' });
      return;
    }
    this.setData({ isSubmitting: true });
    const payload = {
      id: this.data.targetId,
      name: this.data.formData.title,
      displayName: this.data.formData.title,
      city: this.data.formData.city,
      phone,
    };
    if (!this.data.isApplicationMode) {
      payload.role = AUTH_ROLES.GUIDE;
    }
    if (this.data.canEditStatus) {
      payload.displayRole = this.data.formData.statusText;
    }
    const res = this.data.isApplicationMode
      ? await DirectoryRepository.applyForRole({ ...payload, requestedRole: AUTH_ROLES.GUIDE })
      : await DirectoryRepository.saveUser(payload);
    this.setData({ isSubmitting: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '保存导游/领队资料失败', icon: 'none' });
      return;
    }
    AuthService.updateCurrentProfile(res.data);
    wx.showToast({ title: this.data.isApplicationMode ? '申请已提交' : '导游/领队资料已保存', icon: 'success' });
    setTimeout(() => navigateBackOrTab('/pages/my/index'), 300);
  },

  onBack() {
    navigateBackOrTab('/pages/my/index');
  }
});
