import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateBackOrTab, navigateByUrl } from '~/utils/navigation';

Page({
  data: {
    pageTitle: '客户资料',
    canSave: false,
    isLoggedIn: false,
    disabledReason: '请先登录后维护客户资料',
    pageErrorText: '',
    isSubmitting: false,
    isDirty: false,
    formData: {
      name: '',
      phone: '',
      city: '',
      introduction: '',
    },
  },

  onLoad() {
    this.loadCustomerProfile();
  },

  onShow() {
    if (!this.data.isSubmitting && !this.data.isDirty) {
      this.loadCustomerProfile();
    }
  },

  getEmptyFormData() {
    return {
      name: '',
      phone: '',
      city: '',
      introduction: '',
    };
  },

  async loadCustomerProfile() {
    const profile = AuthService.getCurrentProfile();
    const canSave = Boolean(
      canUseFeature(profile, FEATURE_KEYS.PROFILE)
      && profile.role === AUTH_ROLES.CUSTOMER
    );
    if (!canSave) {
      let disabledReason = '请先登录后维护客户资料';
      if (profile && profile.role === AUTH_ROLES.CUSTOMER) {
        disabledReason = AuthService.getAccessStateText(profile);
      } else if (profile) {
        disabledReason = '当前账号不是客户身份，不能维护客户资料。';
      }
      this.setData({
        canSave: false,
        isLoggedIn: Boolean(profile),
        disabledReason,
        pageErrorText: '',
        formData: this.getEmptyFormData(),
      });
      return;
    }

    this.setData({
      canSave: true,
      isLoggedIn: true,
      disabledReason: '',
      pageErrorText: '',
    });

    const res = await DirectoryRepository.getUserById(profile.id);
    if (!res.success) {
      const errorText = res.error || '加载客户资料失败';
      this.setData({
        pageErrorText: errorText,
        formData: this.getEmptyFormData(),
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }

    const user = res.data || {};
    this.setData({
      pageErrorText: '',
      formData: {
        name: user.displayName || user.name || '',
        phone: user.phone || '',
        city: user.city || '',
        introduction: user.introduction || '',
      },
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail && e.detail.value !== undefined ? e.detail.value : '';
    if (!field) return;
    this.setData({ [`formData.${field}`]: value, isDirty: true });
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/customer/edit/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  async onSave() {
    const profile = AuthService.getCurrentProfile();
    if (!this.data.canSave || !profile || profile.role !== AUTH_ROLES.CUSTOMER) {
      wx.showToast({ title: '当前账号没有客户资料维护权限', icon: 'none' });
      return;
    }
    if (this.data.pageErrorText) {
      wx.showToast({ title: this.data.pageErrorText, icon: 'none' });
      return;
    }

    const name = String(this.data.formData.name || '').trim();
    const phone = String(this.data.formData.phone || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写客户姓名', icon: 'none' });
      return;
    }
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入 11 位中国大陆手机号', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    const res = await DirectoryRepository.saveUser({
      id: profile.id,
      name,
      displayName: name,
      phone,
      city: String(this.data.formData.city || '').trim(),
      introduction: String(this.data.formData.introduction || '').trim(),
    });
    this.setData({ isSubmitting: false });

    if (!res.success) {
      wx.showToast({ title: res.error || '保存客户资料失败', icon: 'none' });
      return;
    }

    this.setData({ isDirty: false });
    AuthService.updateCurrentProfile(res.data);
    wx.showToast({ title: '客户资料已保存', icon: 'success' });
    setTimeout(() => navigateBackOrTab('/pages/my/index'), 300);
  },
});
