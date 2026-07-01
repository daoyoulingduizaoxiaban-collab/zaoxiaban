import useToastBehavior from '~/behaviors/useToast';
import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { canUseAdminPortal, canUseProviderPortal } from '~/services/auth/roleScope';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    isLoggedIn: false,
    service: [],
    personalInfo: {},
    authSession: {},
    qaSeedInfo: {},
    gridList: [
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
        name: 'QA Seed',
        icon: 'file-copy',
        type: 'qaSeed',
        url: '',
      },
    ],

    settingList: [
      { name: '供应商资料', icon: 'shop', type: 'providers' },
      { name: '系统管理员', icon: 'user-setting', type: 'admin' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
  },

  onLoad() {
    this.loadQaSeed();
  },

  async onShow() {
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();

    this.setData({
      isLoad: Boolean(profile),
      isLoggedIn: Boolean(profile),
      personalInfo: profile ? this.toPersonalInfo(profile) : {},
      authSession: session || {},
    });
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
        { name: '重置 QA Seed', icon: 'refresh', type: 'resetQaSeed' },
        { name: '供应商', icon: 'shop', type: 'providers', url: '/pages/providers/index' },
        { name: '管理员提示', icon: 'user-setting', type: 'admin' },
        { name: '未完成功能', icon: 'info-circle', type: 'todo' },
      ],
    });
  },

  toPersonalInfo(profile) {
    return {
      name: profile.displayName,
      city: profile.city || '未填写城市',
      star: profile.roleLabel,
      image: profile.avatarUrl || '/static/avatar1.png',
      authSourceText: profile.isMockOpenId ? '本地身份验证' : '微信 OpenID 已验证',
    };
  },

  onLogin(e) {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  onNavigateTo() {
    wx.navigateTo({ url: `/pages/my/info-edit/index` });
  },

  onResetQaSeed() {
    QaSeedMock.resetSeed();
    this.loadQaSeed();
    wx.showToast({ title: 'QA Seed 已重置', icon: 'success' });
  },

  onLogout() {
    AuthService.logout();
    this.onShow();
    wx.showToast({ title: '已退出登录', icon: 'success' });
  },

  onEleClick(e) {
    const { name, url, type } = e.currentTarget.dataset.data;
    if (url) {
      wx.navigateTo({
        url,
        fail: () => wx.switchTab({ url }),
      });
      return;
    }
    if (type === 'resetQaSeed' || type === 'qaSeed') {
      this.onResetQaSeed();
      return;
    }
    if (type === 'admin') {
      const profile = AuthService.getCurrentProfile();
      if (!canUseAdminPortal(profile)) {
        wx.showModal({
          title: '系统管理员入口',
          content: '当前角色无管理员权限。管理员后台尚未完成，不会开放全站管理。',
          showCancel: false,
          confirmText: '知道了',
        });
        return;
      }
      const admin = QaSeedMock.getAdmins()[0];
      wx.showModal({
        title: admin.title,
        content: `${admin.note}\n\n管理员后台尚未完成，暂不提供全站管理操作。`,
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
          content: '供应商后台暂未开放。当前 MVP 只保留最小提示入口，不提供供应商管理操作。',
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
