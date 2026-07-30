import { AuthService } from '~/services/auth/authService';
import { useAccessPage } from '~/behaviors/useAccessPage';
import { AUTH_ROLES, FEATURE_KEYS, canUseFeature, hasRole, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { navigateByUrl } from '~/utils/navigation';

Page({
  behaviors: [useAccessPage],
  data: {
    titleText: '团主',
    tourGuidesList: [],
    canCreateTourGuide: false,
    canEditOwnTourGuide: false,
    // 统一三态：loading / ready / error / empty
    pageState: 'loading',
    stateText: '',
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
    if (this.isLoadingTourGuides) return;
    this.isLoadingTourGuides = true;
    await AuthService.refreshSession();
    if ((this as any).requireLogin()) { this.isLoadingTourGuides = false; return; }
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.TOUR_GUIDES)) {
      this.setData({
        tourGuidesList: [],
        canCreateTourGuide: false,
        canEditOwnTourGuide: false,
        pageState: 'empty',
        stateText: AuthService.getAccessStateText(profile),
      });
      this.isLoadingTourGuides = false;
      return;
    }

    this.setData({ pageState: 'loading', stateText: '' });
    const res = await DirectoryRepository.listGuides();
    const canCreateTourGuide = isOwnerOrAdmin(profile);
    const canEditOwnTourGuide = hasRole(profile, AUTH_ROLES.GUIDE);
    if (!res.success) {
      this.setData({
        tourGuidesList: [],
        canCreateTourGuide,
        canEditOwnTourGuide,
        pageState: 'error',
        stateText: res.error || '读取团主资料失败，请稍后重试',
      });
      this.isLoadingTourGuides = false;
      return;
    }
    const visibleUsers = res.data || [];
    this.setData({
      tourGuidesList: visibleUsers
        .map(user => ({
          id: user.id,
          title: user.name || user.displayName,
          statusText: user.displayRole,
          description: `${user.city || '城市未填写'}｜手机号 ${user.phone || '未填写'}`,
        })),
      canCreateTourGuide,
      canEditOwnTourGuide,
      pageState: visibleUsers.length ? 'ready' : 'empty',
      stateText: visibleUsers.length ? '' : '当前账号没有可查看的团主资料。',
    });
    this.isLoadingTourGuides = false;
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.tourGuidesList.find(guide => guide.id === id);
    wx.showModal({
      title: item ? item.title : '团主',
      content: item ? `${item.statusText}\n${item.description}` : '未找到团主资料。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onGoToEdit(e) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.TOUR_GUIDES) || (!this.data.canCreateTourGuide && !this.data.canEditOwnTourGuide)) {
      wx.showToast({ title: '当前账号不能维护团主资料', icon: 'none' });
      return;
    }
    const id = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
      || (!this.data.canCreateTourGuide && profile ? profile.id : '');
    const url = id ? `/pages/tourGuides/edit/index?id=${id}` : '/pages/tourGuides/edit/index';

    navigateByUrl(url, {
      fail: () => {
        wx.showToast({ title: '打开团主表单失败', icon: 'none' });
      }
    });
  }
});
