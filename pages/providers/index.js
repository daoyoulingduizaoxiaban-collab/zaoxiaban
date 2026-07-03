import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, canUseProviderPortal, hasRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateByUrl } from '~/utils/navigation';

Page({
  data: {
    titleText: '供应商',
    providersList: [],
    disabledReason: '',
    canCreateProvider: false,
    canEditOwnProvider: false,
    providerActionIcon: 'add',
    providerActionLabel: '新增供应商',
  },

  async onLoad() {
    await AuthService.refreshSession();
    await this.loadProviders();
  },

  async loadProviders() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) {
      this.setData({
        providersList: [],
        disabledReason: '当前账号没有供应商资料管理权限。',
        canCreateProvider: false,
        canEditOwnProvider: false,
        providerActionIcon: 'add',
        providerActionLabel: '新增供应商',
      });
      return;
    }

    const res = await DirectoryRepository.listProviders();
    const providers = res.success ? res.data : [];
    const canCreateProvider = isOwnerOrAdmin(profile);
    const canEditOwnProvider = profile && hasRole(profile, AUTH_ROLES.PROVIDER);
    this.setData({
      providersList: providers.map(provider => ({
        ...provider,
        contactText: provider.contact || '联系人未填写',
        noteText: provider.note || '资料说明未填写',
      })),
      disabledReason: res.success ? '' : (res.error || '当前账号没有供应商资料管理权限。'),
      canCreateProvider,
      canEditOwnProvider,
      providerActionIcon: canCreateProvider ? 'add' : 'edit',
      providerActionLabel: canCreateProvider ? '新增供应商' : '编辑供应商资料',
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.providersList.find(provider => provider.id === id);
    wx.showModal({
      title: item ? item.title : '供应商',
      content: item ? `${item.contactText}\n${item.noteText}` : '未找到供应商资料。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  async onShow() {
    await AuthService.refreshSession();
    await this.loadProviders();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'providers'
      });
    }
  },

  onGoToEdit(e) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) {
      wx.showToast({ title: '当前账号没有供应商资料管理权限', icon: 'none' });
      return;
    }
    const id = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
      || (!this.data.canCreateProvider && profile ? (profile.providerId || profile.id) : '');
    const url = id ? `/pages/providers/edit/index?id=${id}` : '/pages/providers/edit/index';

    navigateByUrl(url, {
      fail: () => wx.showToast({ title: '打开供应商表单失败', icon: 'none' }),
    });
  }
});
