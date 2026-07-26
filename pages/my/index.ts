import useToastBehavior from '~/behaviors/useToast';
import { AuthService } from '~/services/auth/authService';
import {
  AUTH_ROLES,
  FEATURE_KEYS,
  canUseAdminPortal,
  canUseFeature,
  canUseProviderPortal,
  hasRole,
} from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';

const SETTING_ICON_TEXT = {
  setting: '⚙',
  user: '人',
  edit: '笔',
  usergroup: '团',
  time: '记',
  shop: '店',
  'user-setting': '权',
};

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
    accessStateDesc: '管理员确认身份后，会开放与你角色对应的正式功能。',
    isNavigatingLogin: false,
    canUseBusiness: false,
    canShowPreviewNotice: false,
    canShowDeviceOnlyNotice: false,
    canShowRolePreviewNotice: false,
    realRoleText: '',
    previewRoleText: '',
    // 九宫格不再重复底部 NAV 的团单/客户订单/商品库/工作台入口（A12/B5）；实际项由 buildGridList 按角色生成。
    gridList: [],

    settingList: [],
  },

  onShow() {
    // 立即用本地已存档渲染（不等后端），避免首屏空白 1 秒。
    this.renderProfileView();
    // 后台校验登录状态；仅当身份/状态真的变了才重渲染，避免无谓闪烁。
    this.backgroundRefreshProfile();
  },

  renderProfileView() {
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const canUseBusiness = AuthService.canUseBusiness(profile);

    this.setData({
      isLoad: Boolean(profile),
      isLoggedIn: Boolean(profile),
      accessState: AuthService.getAccessState(profile),
      accessStateText: AuthService.getAccessStateText(profile),
      accessStateDesc: this.getAccessStateDesc(AuthService.getAccessState(profile)),
      canUseBusiness,
      canShowPreviewNotice: AuthService.canShowQaTools(profile, session),
      canShowDeviceOnlyNotice: AuthService.canShowQaTools(profile, session) && session && session.isMockOpenId && !session.qaOverride,
      canShowRolePreviewNotice: Boolean(profile && profile.isRolePreview),
      realRoleText: profile && profile.realRoleLabel ? profile.realRoleLabel : '',
      previewRoleText: profile && profile.isRolePreview ? profile.roleLabel : '',
      personalInfo: profile ? this.toPersonalInfo(profile) : {},
      authSession: session || {},
      gridList: this.buildGridList(profile),
      settingList: this.buildSettingList(profile),
    });
    this.refreshTabBar();
  },

  profileFingerprint(profile) {
    if (!profile) return 'none';
    return [
      profile.openId,
      (profile.roles || []).join(','),
      profile.reviewStatus || profile.status || '',
      profile.roleExpiresAt || '',
      profile.isRolePreview ? 'preview' : '',
    ].join('|');
  },

  async backgroundRefreshProfile() {
    if (this._bgRefreshing) return;
    this._bgRefreshing = true;
    const before = this.profileFingerprint(AuthService.getCurrentProfile());
    try {
      await AuthService.refreshSession();
    } finally {
      this._bgRefreshing = false;
    }
    const after = this.profileFingerprint(AuthService.getCurrentProfile());
    if (before !== after) this.renderProfileView();
  },

  refreshTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar() && this.getTabBar().refreshTabBar) {
      this.getTabBar().refreshTabBar();
    }
  },

  buildGridList(profile) {
    if (!AuthService.canUseBusiness(profile)) return [];

    // 我的页九宫格只放非 NAV 主流程的辅助入口（消息/搜索/数据中心）；团单/客户订单/商品库/工作台/开团不在此重复（A12/B5）。
    const list = [
      {
        name: '消息',
        icon: 'chat',
        type: 'message',
        url: '/pages/message/index',
        feature: FEATURE_KEYS.MESSAGE,
      },
      {
        name: '搜索',
        icon: 'search',
        type: 'search',
        url: `/pages/search/index?from=${encodeURIComponent('/pages/my/index')}`,
        feature: FEATURE_KEYS.SEARCH,
      },
    ];

    const filteredList = list
      .filter(entry => canUseFeature(profile, entry.feature))
      .map(({ feature, ...entry }) => entry);

    if (canUseFeature(profile, FEATURE_KEYS.DATA_CENTER)) {
      filteredList.push({
        name: '数据中心',
        icon: 'data-display',
        type: 'dataCenter',
        url: '/pages/dataCenter/index',
      });
    }

    return filteredList;
  },

  buildSettingList(profile) {
    const list = [
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ];

    if (!AuthService.canUseBusiness(profile)) {
      if (AuthService.canUseRolePreview()) {
        list.push({
          name: '角色预览',
          icon: 'user-setting',
          type: 'rolePreview',
        });
      }
      return list;
    }

    const roleEntries = [
      { name: '个人资料', icon: 'user', type: 'profile', url: '/pages/profile/index', feature: FEATURE_KEYS.PROFILE },
      { name: '账号资料', icon: 'edit', type: 'infoEdit', url: '/pages/my/info-edit/index', feature: FEATURE_KEYS.INFO_EDIT },
      { name: '用户审核', icon: 'user-setting', type: 'userReview', url: '/pages/userReview/index', feature: FEATURE_KEYS.USER_REVIEW },
      { name: '团主资料', icon: 'usergroup', type: 'tourGuides', url: '/pages/tourGuides/index', feature: FEATURE_KEYS.TOUR_GUIDES },
      { name: '供应商资料', icon: 'shop', type: 'providers', url: '/pages/providers/index', feature: FEATURE_KEYS.PROVIDERS },
      { name: '操作记录', icon: 'time', type: 'operationLogs', url: '/pages/operationLogs/index', feature: FEATURE_KEYS.OPERATION_LOGS },
    ];

    roleEntries.forEach((entry) => {
      if (canUseFeature(profile, entry.feature)) {
        const { feature, ...item } = entry;
        list.push(item);
      }
    });

    if (AuthService.canUseRolePreview()) {
      list.push({
        name: '角色预览',
        icon: 'user-setting',
        type: 'rolePreview',
      });
    }

    if (profile && hasRole(profile, AUTH_ROLES.CUSTOMER)) {
      // 客户资料并入「账号资料」(info-edit) 唯一自我编辑入口；此处不再单列（归并决策）。
      list.push({
        name: '申请团主',
        icon: 'usergroup',
        type: 'tourGuideApply',
        url: '/pages/tourGuides/edit/index',
      });
    }

    return list.map(item => ({
      ...item,
      iconText: SETTING_ICON_TEXT[item.icon] || '•',
    }));
  },

  toPersonalInfo(profile) {
    let authSourceText = '微信账号已验证';
    if (profile.qaOverride) {
      authSourceText = '账号资料已载入';
    } else if (profile.isMockOpenId) {
      authSourceText = '账号资料已载入';
    }

    return {
      name: profile.displayName,
      city: profile.city || '未填写城市',
      star: profile.roleLabel,
      image: profile.avatarUrl || '/static/avatar1.png',
      authSourceText,
    };
  },

  getAccessStateDesc(accessState) {
    const descMap = {
      pending_review: '管理员确认身份后，会开放与你角色对应的正式功能。',
      rejected: '当前账号未获准使用系统，请联系管理员确认原因。',
      disabled: '当前账号已被停用，如需恢复请联系管理员。',
      expired: '当前账号的角色使用期限已过，请联系管理员续期后再使用。',
      logged_out: '请先完成微信登录。',
    };
    return descMap[accessState] || descMap.pending_review;
  },

  onLoginTouchEnd() {
    this.onLogin();
  },

  onLogin() {
    if (this.data.isNavigatingLogin) return;
    this.setData({ isNavigatingLogin: true });
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/my/index')}`, {
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
    this.openUrl(url);
  },

  onLogout() {
    AuthService.logout();
    getApp().globalData.userInfo = null;
    this.onShow();
    this.refreshTabBar();
    wx.showToast({ title: '已退出登录', icon: 'success' });
  },

  async onRefreshAccessState() {
    await AuthService.refreshSession();
    this.onShow();
    this.refreshTabBar();
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
    const dataset = (e.currentTarget && e.currentTarget.dataset) || {};
    const detail = e.detail || {};
    const data = dataset.data || detail.data || detail.item || {};
    const name = dataset.name || detail.name || data.name || '';
    const type = dataset.type || detail.type || data.type || '';
    const url = dataset.url || detail.url || data.url || '';
    const navKey = `${type || name || ''}:${url}`;
    const now = Date.now();
    if (this.lastNavKey === navKey && now - (this.lastNavAt || 0) < 800) return;
    this.lastNavKey = navKey;
    this.lastNavAt = now;
    const loginRequiredTypes = ['profile', 'tourGuides', 'providers', 'dataCenter', 'userReview', 'operationLogs', 'providerApply', 'rolePreview'];
    if (!this.data.isLoggedIn && loginRequiredTypes.includes(type)) {
      this.onLogin();
      return;
    }
    if (url) {
      this.openUrl(url);
      return;
    }
    if (type === 'rolePreview') {
      this.openRolePreview();
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
      wx.showModal({
        title: '系统管理员入口',
        content: '请使用已授权账号处理管理事项。',
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
      this.openUrl('/pages/providers/index');
      return;
    }
    this.onShowToast('#t-toast', name);
  },

  openUrl(url) {
    if (!url) {
      wx.showToast({ title: '暂时无法打开该页面', icon: 'none' });
      return;
    }
    const fail = () => wx.showToast({ title: '暂时无法打开该页面', icon: 'none' });
    navigateByUrl(url, { fail });
  },

  openRolePreview() {
    const realProfile = AuthService.getRealProfile();
    const currentProfile = AuthService.getCurrentProfile();
    wx.showModal({
      title: '角色预览',
      content: `真实身份：${realProfile.roleLabel || ''}\n当前预览：${currentProfile.roleLabel || '未启用'}\n此功能只改变当前画面视角，不修改真实账号角色。`,
      confirmText: '切换',
      cancelText: '退出预览',
      success: (modalRes) => {
        if (modalRes.confirm) {
          this.showRolePreviewActions();
          return;
        }
        AuthService.clearRolePreview();
        this.onShow();
      },
    });
  },

  showRolePreviewActions() {
    const roles = [
      { label: '游客', value: 'visitor' },
      { label: '已停用', value: 'disabled' },
      { label: '客户', value: AUTH_ROLES.CUSTOMER },
      { label: '团主', value: AUTH_ROLES.GUIDE },
      { label: '运营管理员', value: AUTH_ROLES.ADMIN },
      { label: '产品拥有者', value: AUTH_ROLES.OWNER },
    ];
    wx.showActionSheet({
      itemList: roles.map(item => item.label),
      success: (res) => {
        const selected = roles[res.tapIndex];
        if (!selected) return;
        const result = AuthService.applyRolePreview(selected.value);
        wx.showToast({ title: result.success ? `已切换为${selected.label}` : result.error, icon: 'none' });
        this.onShow();
      },
    });
  },
});
