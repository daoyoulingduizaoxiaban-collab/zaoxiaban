import useToastBehavior from '~/behaviors/useToast';
import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseAdminPortal, canUseFeature, canUseProviderPortal } from '~/services/auth/roleScope';

const TAB_PAGE_URLS = new Set([
  '/pages/groupOrder/index',
  '/pages/customerOrders/index',
  '/pages/productManagement/index',
  '/pages/my/index',
]);

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    isLoggedIn: false,
    service: [],
    personalInfo: {},
    authSession: {},
    accessState: 'logged_out',
    accessStateText: '请先登录后继续使用',
    isNavigatingLogin: false,
    canUseBusiness: false,
    qaSeedInfo: {},
    canShowQaTools: false,
    qaRoleOptions: AuthService.qaRoleOptions,
    qaIsolationActions: [
      { label: '切换导游并查看订单', role: 'guide' },
      { label: '切换客户并查看订单', role: 'customer' },
    ],
    gridList: [
      {
        name: '工作台',
        icon: 'app',
        type: 'home',
        url: '/pages/home/index',
      },
      {
        name: '团单',
        icon: 'root-list',
        type: 'all',
        url: '/pages/groupOrder/index',
      },
      {
        name: '客户订单',
        icon: 'search',
        type: 'progress',
        url: '/pages/customerOrders/index',
      },
      {
        name: '商品库',
        icon: 'upload',
        type: 'published',
        url: '/pages/productManagement/index',
      },
    ],

    settingList: [],
  },

  async onShow() {
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const canUseBusiness = AuthService.canUseBusiness(profile);
    const canShowQaTools = AuthService.canShowQaTools(profile, session);

    this.setData({
      isLoad: Boolean(profile),
      isLoggedIn: Boolean(profile),
      accessState: AuthService.getAccessState(profile),
      accessStateText: AuthService.getAccessStateText(profile),
      canUseBusiness,
      personalInfo: profile ? this.toPersonalInfo(profile) : {},
      authSession: session || {},
      canShowQaTools,
      gridList: this.buildGridList(profile),
      settingList: this.buildSettingList(profile),
    });
    if (canShowQaTools) {
      this.loadQaSeed();
    } else {
      this.clearQaSeed();
    }
  },

  buildGridList(profile) {
    if (!AuthService.canUseBusiness(profile)) return [];

    const list = [
      {
        name: '工作台',
        icon: 'app',
        type: 'home',
        url: '/pages/home/index',
      },
      {
        name: '团单',
        icon: 'root-list',
        type: 'all',
        url: '/pages/groupOrder/index',
      },
      {
        name: '客户订单',
        icon: 'search',
        type: 'progress',
        url: '/pages/customerOrders/index',
      },
      {
        name: '商品库',
        icon: 'upload',
        type: 'published',
        url: '/pages/productManagement/index',
      },
      {
        name: '消息',
        icon: 'chat',
        type: 'message',
        url: '/pages/message/index',
      },
      {
        name: '搜索',
        icon: 'search',
        type: 'search',
        url: '/pages/search/index',
      },
    ];

    if (canUseFeature(profile, FEATURE_KEYS.DATA_CENTER)) {
      list.push({
        name: '数据中心',
        icon: 'data-display',
        type: 'dataCenter',
        url: '/pages/dataCenter/index',
      });
    }

    if (canUseFeature(profile, FEATURE_KEYS.RELEASE)) {
      list.push({
        name: '开团',
        icon: 'add',
        type: 'release',
        url: '/pages/release/index',
      });
    }

    return list;
  },

  buildSettingList(profile) {
    const list = [
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ];

    if (!AuthService.canUseBusiness(profile)) return list;

    const roleEntries = [
      { name: '个人资料', icon: 'user', type: 'profile', url: '/pages/profile/index', feature: FEATURE_KEYS.PROFILE },
      { name: '账号资料', icon: 'edit', type: 'infoEdit', url: '/pages/my/info-edit/index', feature: FEATURE_KEYS.INFO_EDIT },
      { name: '用户审核', icon: 'user-setting', type: 'userReview', url: '/pages/userReview/index', feature: FEATURE_KEYS.USER_REVIEW },
      { name: '导游/领队资料', icon: 'usergroup', type: 'tourGuides', url: '/pages/tourGuides/index', feature: FEATURE_KEYS.TOUR_GUIDES },
      { name: '供应商资料', icon: 'shop', type: 'providers', url: '/pages/providers/index', feature: FEATURE_KEYS.PROVIDERS },
    ];

    roleEntries.forEach((entry) => {
      if (canUseFeature(profile, entry.feature)) {
        const { feature, ...item } = entry;
        list.push(item);
      }
    });

    return list;
  },

  loadQaSeed() {
    const seed = QaSeedMock.loadSeed();
    this.setData({
      qaSeedInfo: {
        userCount: seed.users.length,
        groupOrderCount: seed.groupOrders.length,
        productCount: seed.products.length,
        customerOrderCount: seed.customerOrders.length,
      },
      service: [
        { name: '重置演示资料', icon: 'refresh', type: 'resetQaSeed' },
        { name: '供应商资料', icon: 'shop', type: 'providers', url: '/pages/providers/index' },
        { name: '管理员入口', icon: 'user-setting', type: 'admin' },
      ],
    });
  },

  clearQaSeed() {
    this.setData({
      qaSeedInfo: {},
      service: [],
    });
  },

  toPersonalInfo(profile) {
    let authSourceText = '微信账号已验证';
    if (profile.qaOverride) {
      authSourceText = '演示身份';
    } else if (profile.isMockOpenId) {
      authSourceText = '演示身份';
    }

    return {
      name: profile.displayName,
      city: profile.city || '未填写城市',
      star: profile.roleLabel,
      image: profile.avatarUrl || '/static/avatar1.png',
      authSourceText,
    };
  },

  onLoginTouchEnd() {
    this.onLogin();
  },

  onLogin() {
    if (this.data.isNavigatingLogin) return;
    this.setData({ isNavigatingLogin: true });
    wx.navigateTo({
      url: `/pages/login/login?redirectTo=${encodeURIComponent('/pages/my/index')}`,
      complete: () => {
        setTimeout(() => this.setData({ isNavigatingLogin: false }), 600);
      },
      fail: (error) => wx.showModal({
        title: '登录入口',
        content: '打开登录页失败，请稍后重试。',
        showCancel: false,
        confirmText: '知道了',
      }),
    });
  },

  onNavigateTo() {
    const profile = AuthService.getCurrentProfile();
    const url = profile && profile.id ? `/pages/profile/edit/index?id=${profile.id}` : '/pages/profile/index';
    wx.navigateTo({ url });
  },

  onResetQaSeed() {
    if (!this.data.canShowQaTools) {
      wx.showToast({ title: '当前账号不显示演示工具', icon: 'none' });
      return;
    }
    QaSeedMock.resetSeed();
    this.loadQaSeed();
    wx.showToast({ title: '演示资料已重置', icon: 'success' });
  },

  applyQaRole(role) {
    if (!this.data.canShowQaTools) {
      wx.showToast({ title: '当前账号不显示演示工具', icon: 'none' });
      return null;
    }
    const result = AuthService.applyQaOverride({ qaRoleOverride: role });
    if (!result.success) {
      wx.showToast({ title: result.error || '演示身份切换失败', icon: 'none' });
      return null;
    }

    getApp().globalData.userInfo = result.data.profile;
    this.onShow();
    return result.data.profile;
  },

  onQaRoleSwitch(e) {
    const { role } = e.currentTarget.dataset;
    const profile = this.applyQaRole(role);
    if (!profile) return;

    wx.showToast({
      title: `已切换：${profile.roleLabel}`,
      icon: 'none',
    });
  },

  onQaIsolationCheck(e) {
    const { role } = e.currentTarget.dataset;
    const profile = this.applyQaRole(role);
    if (!profile) return;

    wx.showToast({
      title: `已切换：${profile.roleLabel}`,
      icon: 'none',
    });
    wx.switchTab({
      url: '/pages/customerOrders/index',
      fail: () => wx.showToast({ title: '打开客户订单失败', icon: 'none' }),
    });
  },

  onLogout() {
    AuthService.logout();
    getApp().globalData.userInfo = null;
    this.onShow();
    wx.showToast({ title: '已退出登录', icon: 'success' });
  },

  async onRefreshAccessState() {
    await AuthService.refreshSession();
    this.onShow();
    wx.showToast({ title: '状态已刷新', icon: 'none' });
  },

  onContactAdmin() {
    wx.showModal({
      title: '联系管理员',
      content: '请联系运营管理员确认账号身份与使用权限。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onEleClick(e) {
    const { name, url, type } = e.currentTarget.dataset.data;
    const loginRequiredTypes = ['profile', 'tourGuides', 'providers', 'dataCenter', 'userReview'];
    if (!this.data.isLoggedIn && loginRequiredTypes.includes(type)) {
      this.onLogin();
      return;
    }
    if (url) {
      const navigate = TAB_PAGE_URLS.has(url) ? wx.switchTab : wx.navigateTo;
      navigate({
        url,
        fail: () => wx.showToast({ title: '暂时无法打开该页面', icon: 'none' }),
      });
      return;
    }
    if (type === 'resetQaSeed' || type === 'qaSeed') {
      if (!this.data.canShowQaTools) {
        wx.showToast({ title: '当前账号不显示演示工具', icon: 'none' });
        return;
      }
      this.onResetQaSeed();
      return;
    }
    if (type === 'admin') {
      const profile = AuthService.getCurrentProfile();
      if (!canUseAdminPortal(profile)) {
        wx.showModal({
          title: '系统管理员入口',
          content: '当前账号没有管理员权限。',
          showCancel: false,
          confirmText: '知道了',
        });
        return;
      }
      const admin = QaSeedMock.getAdmins()[0];
      wx.showModal({
        title: admin.title,
        content: `${admin.note}\n\n请使用已授权账号处理管理事项。`,
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    if (type === 'providers') {
      const profile = AuthService.getCurrentProfile();
      if (!canUseProviderPortal(profile)) {
        wx.showModal({
          title: '供应商资料',
          content: '当前账号没有供应商资料管理权限。',
          showCancel: false,
          confirmText: '知道了',
        });
        return;
      }
      wx.navigateTo({
        url: '/pages/providers/index',
      });
      return;
    }
    this.onShowToast('#t-toast', name);
  },
});
