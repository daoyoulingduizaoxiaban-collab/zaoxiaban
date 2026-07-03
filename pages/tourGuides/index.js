import { AuthService } from '~/services/auth/authService';
import { AUTH_ROLES, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';

Page({
  data: {
    titleText: '导游/领队',
    tourGuidesList: [],
    canCreateTourGuide: false,
    disabledReason: '',
  },

  onLoad() {
    this.loadTourGuides();
  },

  onShow() {
    this.loadTourGuides();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'my'
      });
    }
  },

  async loadTourGuides() {
    const profile = AuthService.getCurrentProfile();
    if (!profile || (!isOwnerOrAdmin(profile) && profile.role !== AUTH_ROLES.GUIDE)) {
      this.setData({
        tourGuidesList: [],
        canCreateTourGuide: false,
        disabledReason: '当前账号没有导游/领队资料查看权限。',
      });
      return;
    }

    const res = await DirectoryRepository.listGuides();
    const visibleUsers = res.success ? res.data : [];

    this.setData({
      tourGuidesList: visibleUsers
        .map(user => ({
          id: user.id,
          title: user.name || user.displayName,
          statusText: user.displayRole,
          description: `${user.city}｜手机号 ${user.phone}`,
        })),
      canCreateTourGuide: isOwnerOrAdmin(profile),
      disabledReason: visibleUsers.length ? '' : (res.error || '当前账号没有可查看的导游/领队资料。'),
    });
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.tourGuidesList.find(guide => guide.id === id);
    wx.showModal({
      title: item ? item.title : '导游/领队',
      content: item ? `${item.statusText}\n${item.description}` : '未找到导游/领队资料。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onGoToEdit(e) {
    if (!this.data.canCreateTourGuide) {
      wx.showToast({ title: '当前账号不能新增导游/领队资料', icon: 'none' });
      return;
    }
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
