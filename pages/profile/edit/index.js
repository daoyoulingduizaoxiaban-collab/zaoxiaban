import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateBackOrTab } from '~/utils/navigation';

Page({
  data: {
    pageTitle: '新增个人资料',
    isEdit: false,
    canSave: false,
    canEditStatus: false,
    disabledReason: '',
    pageErrorText: '',
    targetId: '',
    isSubmitting: false,
    formData: {
      title: '',
      date: '',
      city: '',
      phone: '',
      statusText: '可显示资料'
    }
  },

  getEmptyFormData() {
    return {
      title: '',
      date: '',
      city: '',
      phone: '',
      statusText: '可显示资料'
    };
  },

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const targetId = options.id || (profile && profile.id) || '';
    const canSave = Boolean(
      canUseFeature(profile, FEATURE_KEYS.PROFILE)
      && (!targetId || isOwnerOrAdmin(profile) || String(targetId) === String(profile.id))
    );
    this.setData({
      canSave,
      canEditStatus: isOwnerOrAdmin(profile),
      disabledReason: canSave ? '' : '当前账号没有个人资料维护权限。',
      pageErrorText: canSave ? '' : '当前账号没有个人资料维护权限。',
      targetId,
      formData: canSave ? this.data.formData : this.getEmptyFormData(),
    });
    if (!canSave) return;
    if (targetId) {
      this.setData({
        pageTitle: '编辑个人资料',
        isEdit: true,
      });
      this.fetchprofileDetail(targetId);
    }
  },

  async fetchprofileDetail(id) {
    const res = await DirectoryRepository.getUserById(id);
    if (!res.success) {
      const errorText = res.error || '加载个人资料失败';
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
      'formData.statusText': user.displayRole || user.roleLabel || user.role || '可显示资料',
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
      wx.showToast({ title: '请填写姓名', icon: 'none' });
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
    if (this.data.canEditStatus) {
      payload.displayRole = this.data.formData.statusText;
    }
    const res = await DirectoryRepository.saveUser(payload);
    this.setData({ isSubmitting: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '保存个人资料失败', icon: 'none' });
      return;
    }
    AuthService.updateCurrentProfile(res.data);
    wx.showToast({ title: '个人资料已保存', icon: 'success' });
    setTimeout(() => navigateBackOrTab('/pages/my/index'), 300);
  },

  onBack() {
    navigateBackOrTab('/pages/my/index');
  }
});
