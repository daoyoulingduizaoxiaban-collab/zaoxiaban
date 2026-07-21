import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateByUrl } from '~/utils/navigation';

Page({
  data: {
    titleText: '个人资料',
    profileList: [],
    canEditCurrentProfile: false,
    currentProfileId: '',
    disabledReason: '',
  },

  async onLoad() {
    await AuthService.refreshSession();
    await this.loadProfiles();
  },

  async onShow() {
    await AuthService.refreshSession();
    await this.loadProfiles();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'my'
      });
    }
  },

  async loadProfiles() {
    const currentProfile = AuthService.getCurrentProfile();
    if (!canUseFeature(currentProfile, FEATURE_KEYS.PROFILE)) {
      this.setData({
        profileList: [],
        canEditCurrentProfile: false,
        currentProfileId: '',
        disabledReason: AuthService.getAccessStateText(currentProfile),
      });
      return;
    }

    const res = await DirectoryRepository.listUsers();
    const visibleUsers = res.success ? res.data : [{
      id: currentProfile.id,
      name: currentProfile.displayName,
      displayName: currentProfile.displayName,
      displayRole: currentProfile.roleLabel,
      city: currentProfile.city,
      phone: currentProfile.phone,
    }];

    this.setData({
      profileList: visibleUsers.map(user => ({
        id: user.id,
        title: user.name || user.displayName,
        statusText: user.displayRole,
        description: `${user.city || '城市未填写'}｜手机号 ${user.phone || '未填写'}`,
      })),
      canEditCurrentProfile: canUseFeature(currentProfile, FEATURE_KEYS.PROFILE),
      currentProfileId: currentProfile.id || '',
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

  onGoToEdit(e) {
    if (!canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.PROFILE)) {
      wx.showToast({ title: '当前账号没有个人资料维护权限', icon: 'none' });
      return;
    }
    const id = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || this.data.currentProfileId;
    const url = id ? `/pages/profile/edit/index?id=${id}` : '/pages/profile/edit/index';

    navigateByUrl(url, {
      fail: () => {
        wx.showToast({ title: '打开个人资料表单失败', icon: 'none' });
      }
    });
  }
});
