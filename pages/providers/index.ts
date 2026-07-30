import { AuthService } from '~/services/auth/authService';
import { canUseProviderPortal, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateByUrl } from '~/utils/navigation';
import { useAccessPage } from '~/behaviors/useAccessPage';

Page({
  behaviors: [useAccessPage],
  data: {
    titleText: '供应商',
    providersList: [],
    disabledReason: '',
    canCreateProvider: false,
    providerActionIcon: 'add',
    providerActionLabel: '新增供应商',
  },

  async onLoad() {
    await AuthService.refreshSession();
    await this.loadProviders();
  },

  async loadProviders() {
    if ((this as any).requireLogin()) return;
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) {
      this.setData({
        providersList: [],
        disabledReason: '当前账号没有供应商资料管理权限。',
        canCreateProvider: false,
        providerActionIcon: 'add',
        providerActionLabel: '新增供应商',
      });
      return;
    }

    const res = await DirectoryRepository.listProviders();
    const providers = res.success ? res.data : [];
    const canCreateProvider = isOwnerOrAdmin(profile);
    this.setData({
      providersList: providers.map(provider => ({
        ...provider,
        contactText: provider.contact || '联系人未填写',
        noteText: provider.note || '资料说明未填写',
        isDisabled: provider.status === 'disabled',
        stateLabel: provider.status === 'disabled' ? '已停用' : (provider.statusText || '可显示资料'),
      })),
      disabledReason: res.success ? '' : (res.error || '当前账号没有供应商资料管理权限。'),
      canCreateProvider,
      providerActionIcon: canCreateProvider ? 'add' : 'edit',
      providerActionLabel: canCreateProvider ? '新增供应商' : '编辑供应商资料',
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.providersList.find(provider => provider.id === id);
    if (!item) {
      wx.showModal({ title: '供应商', content: '未找到供应商资料。', showCancel: false, confirmText: '知道了' });
      return;
    }
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) {
      wx.showModal({
        title: item.title,
        content: `${item.contactText}\n${item.noteText}`,
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    const toggleLabel = item.isDisabled ? '启用供应商' : '停用供应商';
    const itemList = ['查看资料', '编辑资料', toggleLabel, '删除供应商'];
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: item.title,
            content: `${item.stateLabel}\n${item.contactText}\n${item.noteText}`,
            showCancel: false,
            confirmText: '知道了',
          });
        } else if (res.tapIndex === 1) {
          this.onGoToEdit({ currentTarget: { dataset: { id } } });
        } else if (res.tapIndex === 2) {
          this.onToggleStatus(item);
        } else if (res.tapIndex === 3) {
          this.onRemoveProvider(item);
        }
      },
    });
  },

  onToggleStatus(item) {
    const nextStatus = item.isDisabled ? 'active' : 'disabled';
    const actionText = item.isDisabled ? '启用' : '停用';
    wx.showModal({
      title: `${actionText}供应商`,
      content: item.isDisabled
        ? '启用后该供应商的商品可重新进入新团单选品。'
        : '停用后该供应商的商品将不能进入新团单选品，已成团的历史订单不受影响。',
      confirmText: `确认${actionText}`,
      success: async (res) => {
        if (!res.confirm) return;
        const result = await DirectoryRepository.setProviderStatus({ id: item.id, status: nextStatus });
        if (!result.success) {
          wx.showToast({ title: result.error || `${actionText}失败`, icon: 'none' });
          return;
        }
        wx.showToast({ title: `已${actionText}`, icon: 'success' });
        await this.loadProviders();
      },
    });
  },

  onRemoveProvider(item) {
    wx.showModal({
      title: '删除供应商',
      content: '删除后该供应商将从列表移除、其商品不再进入新团单，已成团的历史订单仍保留追溯。确认删除？',
      confirmText: '确认删除',
      confirmColor: '#e34d59',
      success: async (res) => {
        if (!res.confirm) return;
        const result = await DirectoryRepository.removeProvider({ id: item.id });
        if (!result.success) {
          wx.showToast({ title: result.error || '删除失败', icon: 'none' });
          return;
        }
        wx.showToast({ title: '已删除', icon: 'success' });
        await this.loadProviders();
      },
    });
  },

  async onShow() {
    await AuthService.refreshSession();
    await this.loadProviders();
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
