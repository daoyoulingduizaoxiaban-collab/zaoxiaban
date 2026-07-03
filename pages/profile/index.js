import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { isOwnerOrAdmin } from '~/services/auth/roleScope';

const sameId = (a, b) => String(a) === String(b);

Page({
  data: {
    titleText: '个人资料',
    profileList: [],
    canCreateProfile: false,
    disabledReason: '',
  },

  onLoad() {
    this.loadProfiles();
  },

  loadProfiles() {
    const currentProfile = AuthService.getCurrentProfile();
    if (!currentProfile) {
      this.setData({
        profileList: [],
        canCreateProfile: false,
        disabledReason: '请先登录后查看个人资料。',
      });
      return;
    }

    const users = QaSeedMock.getUsers();
    const visibleUsers = isOwnerOrAdmin(currentProfile)
      ? users
      : users.filter(user => sameId(user.id, currentProfile.id) || sameId(user.openId, currentProfile.openId));

    this.setData({
      profileList: visibleUsers.map(user => ({
        id: user.id,
        title: user.name,
        statusText: user.displayRole,
        description: `${user.city}｜手机号 ${user.phone}`,
      })),
      canCreateProfile: isOwnerOrAdmin(currentProfile),
      disabledReason: visibleUsers.length ? '' : '当前账号没有可查看的个人资料。',
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.profileList.find(profile => profile.id === id);
    wx.showModal({
      title: item ? item.title : '个人资料',
      content: item ? `${item.statusText}\n${item.description}` : '未找到个人资料。',
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
    if (!this.data.canCreateProfile) {
      wx.showToast({ title: '当前账号不能新增个人资料', icon: 'none' });
      return;
    }
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
