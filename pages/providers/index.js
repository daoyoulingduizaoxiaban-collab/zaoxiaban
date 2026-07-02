import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { canUseProviderPortal } from '~/services/auth/roleScope';

Page({
  data: {
    titleText: '供应商',
    providersList: [],
    disabledReason: '',
  },

  onLoad() {
    const profile = AuthService.getCurrentProfile();
    const providersList = QaSeedMock.getProviders();
    if (!canUseProviderPortal(profile)) {
      this.setData({
        providersList,
        disabledReason: '供应商后台暂未开放。当前 MVP 只保留最小提示入口，不提供供应商管理操作。',
      });
      return;
    }

    this.setData({
      providersList,
      disabledReason: '',
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

  // 同步 TabBar 狀態 (之前提到的關鍵細節)
  onShow() {
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
      fail: (err) => {
        if (err.errMsg.includes('tabbar')) {
          wx.switchTab({ url });
        } else {
          wx.showToast({ title: '打开供应商表单失败', icon: 'none' });
        }
      }
    });
  }
});
