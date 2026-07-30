import { AuthService } from '~/services/auth/authService';
import { canUseProviderPortal } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateBackOrTab } from '~/utils/navigation';
import { RESULT_TEXT, toastSuccess } from '~/utils/feedback';

Page({
  data: {
    pageTitle: '新增供应商',
    isEdit: false,
    isApplyMode: false,
    canSave: false,
    disabledReason: '',
    pageErrorText: '',
    targetId: '',
    isProviderSelfProfile: false,
    isSubmitting: false,
    isDirty: false,
    formData: {
      title: '',
      contact: '',
      note: '',
      statusText: '可显示资料'
    }
  },

  getEmptyFormData() {
    return {
      title: '',
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
    // provider 已非角色，供应商是团主维护的实体：不再有「申请成为供应商」模式。
    const isApplyMode = false;
    const targetId = options.id || '';
    const canSave = canUseProviderPortal(profile);
    const isProviderSelfProfile = false;
    this.setData({
      pageTitle: '新增供应商',
      isApplyMode,
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
        pageTitle: '编辑供应商',
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
      'formData.contact': provider.contact || '',
      'formData.note': provider.note || '',
      'formData.statusText': provider.statusText || '可显示资料',
    });
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
    const targetId = this.data.targetId || '';
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
    toastSuccess(RESULT_TEXT.save);
    setTimeout(() => navigateBackOrTab('/pages/providers/index'), 300);
  },

  onBack() {
    navigateBackOrTab('/pages/providers/index');
  }
});
