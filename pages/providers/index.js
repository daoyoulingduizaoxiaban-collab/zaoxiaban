import { AuthService } from '~/services/auth/authService';
import { canUseProviderPortal } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';

Page({
  data: {
    titleText: '供应商',
    providersList: [],
    disabledReason: '',
  },

  onLoad() {
    this.loadProviders();
  },

  async loadProviders() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseProviderPortal(profile)) {
      this.setData({
        providersList: [],
        disabledReason: '当前账号没有供应商资料管理权限。',
      });
      return;
    }

    const res = await DirectoryRepository.listProviders();
    this.setData({
      providersList: res.success ? res.data : [],
      disabledReason: res.success ? '' : (res.error || '当前账号没有供应商资料管理权限。'),
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.providersList.find(provider => provider.id === id);
    wx.showModal({
      title: item ? item.title : '供应商',
      content: item ? `${item.contact}\n${item.note}` : '未找到供应商资料。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onShow() {
    this.loadProviders();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'providers'
      });
    }
  },

  onGoToEdit(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    const url = id ? `/pages/providers/edit/index?id=${id}` : '/pages/providers/edit/index';

    wx.navigateTo({
      url: url,
      fail: () => wx.showToast({ title: '打开供应商表单失败', icon: 'none' }),
    });
  }
});
