import { AuthService } from '~/services/auth/authService';
import { isOwnerOrAdmin } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';

Page({
  data: {
    pageTitle: '新增导游/领队',
    isEdit: false,
    canSave: false,
    disabledReason: '',
    targetId: '',
    isSubmitting: false,
    formData: {
      title: '',
      date: '',
      city: '',
      phone: '',
      statusText: '导游/领队'
    }
  },

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const canSave = isOwnerOrAdmin(profile);
    this.setData({
      canSave,
      disabledReason: canSave ? '' : '当前账号没有导游/领队资料维护权限。',
    });
    if (options.id) {
      this.setData({
        pageTitle: '编辑导游/领队',
        isEdit: true,
        targetId: options.id,
      });
      this.fetchtourGuidesDetail(options.id);
    }
  },

  async fetchtourGuidesDetail(id) {
    const res = await DirectoryRepository.getUserById(id);
    if (!res.success) {
      wx.showToast({ title: res.error || '加载导游/领队资料失败', icon: 'none' });
      return;
    }
    const user = res.data;
    this.setData({
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
    if (!String(this.data.formData.title || '').trim()) {
      wx.showToast({ title: '请填写导游/领队名称', icon: 'none' });
      return;
    }
    this.setData({ isSubmitting: true });
    const res = await DirectoryRepository.saveUser({
      id: this.data.targetId,
      name: this.data.formData.title,
      displayName: this.data.formData.title,
      city: this.data.formData.city,
      phone: this.data.formData.phone,
      role: 'guide',
      displayRole: this.data.formData.statusText,
    });
    this.setData({ isSubmitting: false });
    if (!res.success) {
      wx.showToast({ title: res.error || '保存导游/领队资料失败', icon: 'none' });
      return;
    }
    wx.showToast({ title: '导游/领队资料已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 300);
  },

  onBack() {
    wx.navigateBack();
  }
});
