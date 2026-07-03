import { AuthService } from '~/services/auth/authService';
import { isOwnerOrAdmin } from '~/services/auth/roleScope';

Page({
  data: {
    pageTitle: '新增个人资料',
    isEdit: false,
    canSave: false,
    disabledReason: '',
    formData: {
      title: '',
      date: '',
      statusText: '演示资料'
    }
  },

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const canSave = isOwnerOrAdmin(profile);
    this.setData({
      canSave,
      disabledReason: canSave ? '' : '当前账号没有个人资料维护权限。',
    });
    if (options.id) {
      this.setData({
        pageTitle: '编辑个人资料',
        isEdit: true
      });
      this.fetchprofileDetail(options.id);
    }
  },

  fetchprofileDetail(id) {
    this.setData({
      'formData.title': '林秝帆',
      'formData.date': '2026-01-07'
    });
  },

  showDatePicker() {
    const today = new Date().toISOString().slice(0, 10);
    this.setData({ 'formData.date': today });
    wx.showToast({ title: '已填入今日维护日期', icon: 'none' });
  },

  onSave() {
    if (!this.data.canSave) {
      wx.showToast({ title: '当前账号没有保存权限', icon: 'none' });
      return;
    }
    wx.showToast({ title: '演示保存：资料仅保留在当前设备', icon: 'none' });
  },

  onBack() {
    wx.navigateBack();
  }
});
