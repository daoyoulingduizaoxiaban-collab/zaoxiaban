import { QaSeedMock } from '~/mock/qaSeed';

Page({
  data: {
    titleText: '导游/领队',
    tourGuidesList: []
  },

  onLoad() {
    this.setData({
      tourGuidesList: QaSeedMock.getUsers()
        .filter(user => user.role === 'owner' || user.role === 'guide')
        .map(user => ({
          id: user.id,
          title: user.name,
          statusText: user.displayRole,
          description: `${user.city}｜测试手机号 ${user.phone}`,
        }))
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.tourGuidesList.find(guide => guide.id === id);
    wx.showModal({
      title: item ? item.title : '导游/领队',
      content: item ? `${item.statusText}\n${item.description}\nQA 展示模式，详情页暂未开发。` : '未找到导游/领队资料。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'my'
      });
    }
  },

  onGoToEdit(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    const url = id ? `/pages/tourGuides/edit/index?id=${id}` : '/pages/tourGuides/edit/index';

    wx.navigateTo({
      url: url,
      fail: () => {
        wx.showToast({ title: '打开导游/领队表单失败', icon: 'none' });
      }
    });
  }
});
