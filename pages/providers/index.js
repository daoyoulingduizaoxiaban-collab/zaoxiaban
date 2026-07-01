import { QaSeedMock } from '~/mock/qaSeed';

Page({
  data: {
    titleText: '供应商',
    providersList: []
  },

  onLoad() {
    this.setData({
      providersList: QaSeedMock.getProviders()
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
