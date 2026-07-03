import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, canUseProviderPortal } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateBackOrTab } from '~/utils/navigation';

Page({
  data: {
    pageTitle: '新增供应商',
    isEdit: false,
    canSave: false,
    disabledReason: '',
    pageErrorText: '',
    targetId: '',
    isProviderSelfProfile: false,
    isSubmitting: false,
    isDirty: false,
    formData: {
      title: '',
      date: '',
      contact: '',
      note: '',
      statusText: '可显示资料'
    }
  },

  getEmptyFormData() {
    return {
      title: '',
      date: '',
      contact: '',
      note: '',
      statusText: '可显示资料'
    };
  },

  onLoad(options) {
    this.initPage(options);
  },

  onShow() {
    if (this.data.canSave && this.data.targetId && !this.data.isSubmitting && !this.data.isDirty) {
      this.fetchprovidersDetail(this.data.targetId);
    }
  },

  initPage(options = {}) {
    const profile = AuthService.getCurrentProfile();
    const providerSelfId = profile && profile.role === AUTH_ROLES.PROVIDER ? (profile.providerId || profile.id) : '';
    const targetId = options.id || providerSelfId || '';
    const canSave = canUseProviderPortal(profile);
    const isProviderSelfProfile = Boolean(
      profile
      && profile.role === AUTH_ROLES.PROVIDER
      && targetId
      && String(targetId) === String(providerSelfId)
    );
    this.setData({
      pageTitle: isProviderSelfProfile ? '维护供应商资料' : '新增供应商',
      canSave,
      isProviderSelfProfile,
      disabledReason: canSave ? '' : '当前账号没有供应商资料维护权限。',
      pageErrorText: canSave ? '' : '当前账号没有供应商资料维护权限。',
      targetId,
      formData: canSave ? this.data.formData : this.getEmptyFormData(),
    });
    if (!canSave) return;
    if (targetId) {
      this.setData({
        pageTitle: isProviderSelfProfile ? '维护供应商资料' : '编辑供应商',
        isEdit: true,
      });
      this.fetchprovidersDetail(targetId);
    }
  },

  async fetchprovidersDetail(id) {
    const res = await DirectoryRepository.getProviderById(id);
    if (!res.success) {
      if (this.data.isProviderSelfProfile) {
        this.setData({
          pageErrorText: '',
          isEdit: false,
          formData: this.getEmptyFormData(),
        });
        return;
      }
      const errorText = res.error || '加载供应商资料失败';
      this.setData({
        pageErrorText: errorText,
        formData: this.getEmptyFormData(),
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }
    const provider = res.data;
    this.setData({
      pageErrorText: '',
      'formData.title': provider.title || '',
      'formData.date': (provider.updatedAt || '').slice(0, 10),
      'formData.contact': provider.contact || '',
      'formData.note': provider.note || '',
      'formData.statusText': provider.statusText || '可显示资料',
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
    this.setData({ [`formData.${field}`]: value, isDirty: true });
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
      wx.showToast({ title: '请填写供应商名称', icon: 'none' });
      return;
    }
    if (!String(this.data.formData.contact || '').trim()) {
      wx.showToast({ title: '请填写供应商联系人', icon: 'none' });
      return;
    }
    this.setData({ isSubmitting: true });
    const profile = AuthService.getCurrentProfile();
    const targetId = this.data.targetId || (profile && profile.role === AUTH_ROLES.PROVIDER ? (profile.providerId || profile.id) : '');
    const res = await DirectoryRepository.saveProvider({
      id: targetId,
      title: this.data.formData.title,
      contact: this.data.formData.contact,
      note: this.data.formData.note,
      statusText: this.data.formData.statusText,
    });
    this.setData({ isSubmitting: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '保存供应商资料失败', icon: 'none' });
      return;
    }
    this.setData({ isDirty: false });
    if (profile && profile.role === AUTH_ROLES.PROVIDER) {
      AuthService.updateCurrentProfile({
        id: profile.id,
        openId: profile.openId,
        providerId: res.data.id || targetId,
      });
    }
    wx.showToast({ title: '供应商资料已保存', icon: 'success' });
    setTimeout(() => navigateBackOrTab('/pages/my/index'), 300);
  },

  onBack() {
    navigateBackOrTab('/pages/my/index');
  }
});
