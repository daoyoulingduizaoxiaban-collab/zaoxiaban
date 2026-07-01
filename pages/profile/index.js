import { QaSeedMock } from '~/mock/qaSeed';

Page({
  data: {
    titleText: '个人资料',
    profileList: []
  },

  onLoad() {
    this.setData({
      profileList: QaSeedMock.getUsers().map(user => ({
        id: user.id,
        title: user.name,
        statusText: user.displayRole,
        description: `${user.city}｜测试手机号 ${user.phone}`,
      }))
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.profileList.find(profile => profile.id === id);
    wx.showModal({
      title: item ? item.title : '个人资料',
      content: item ? `${item.statusText}\n${item.description}\nQA 展示模式，详情页暂未开发。` : '未找到个人资料。',
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
    const url = id ? `/pages/profile/edit/index?id=${id}` : '/pages/profile/edit/index';

    wx.navigateTo({
      url: url,
      fail: () => {
        wx.showToast({ title: '打开个人资料表单失败', icon: 'none' });
      }
    });
  }
});
