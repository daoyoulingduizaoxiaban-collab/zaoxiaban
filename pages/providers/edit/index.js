import { AuthService } from '~/services/auth/authService';
import { canUseProviderPortal } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';

Page({
  data: {
    pageTitle: '新增供应商',
    isEdit: false,
    canSave: false,
    disabledReason: '',
    targetId: '',
    isSubmitting: false,
    formData: {
      title: '',
      date: '',
      contact: '',
      note: '',
      statusText: '可显示资料'
    }
  },

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const canSave = canUseProviderPortal(profile);
    this.setData({
      canSave,
      disabledReason: canSave ? '' : '当前账号没有供应商资料维护权限。',
    });
    if (options.id) {
      this.setData({
        pageTitle: '编辑供应商',
        isEdit: true,
        targetId: options.id,
      });
      this.fetchprovidersDetail(options.id);
    }
  },

  async fetchprovidersDetail(id) {
    const res = await DirectoryRepository.getProviderById(id);
    if (!res.success) {
      wx.showToast({ title: res.error || '加载供应商资料失败', icon: 'none' });
      return;
    }
    const provider = res.data;
    this.setData({
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
    this.setData({ [`formData.${field}`]: value });
  },

  async onSave() {
    if (!this.data.canSave) {
      wx.showToast({ title: '当前账号没有保存权限', icon: 'none' });
      return;
    }
    if (!String(this.data.formData.title || '').trim()) {
      wx.showToast({ title: '请填写供应商名称', icon: 'none' });
      return;
    }
    this.setData({ isSubmitting: true });
    const res = await DirectoryRepository.saveProvider({
      id: this.data.targetId,
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
    wx.showToast({ title: '供应商资料已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 300);
  },

  onBack() {
    wx.navigateBack();
  }
});
