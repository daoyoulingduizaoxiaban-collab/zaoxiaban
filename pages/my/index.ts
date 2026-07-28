import useToastBehavior from '~/behaviors/useToast';
import config from '~/config';
import { AuthService } from '~/services/auth/authService';
import {
  AUTH_ROLES,
  FEATURE_KEYS,
  canUseAdminPortal,
  canUseFeature,
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
    isDev: config.isDev, // #F3 复制ID 仅开发环境显示

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
    // 未登录：reLaunch 进「微信登录」页(gate 模式:清栈+无返回=只有一步)。成功回本页、失败留登录页。
    if (!AuthService.getCurrentProfile()) {
      wx.reLaunch({ url: '/pages/login/login?gate=1' });
      return;
    }
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

    // 我的页九宫格只放非 NAV 主流程的辅助入口（搜索/数据中心）；团单/客户订单/商品库/工作台/开团不在此重复（A12/B5）。
    // 「消息」入口已按用户决定(2026-07-27)拿掉；pages/message 页本体+注解保留备用（见该页「消息机制说明」）。
    const list = [
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
      // 「个人资料」入口已移除(P0-2)：它指向 pages/profile 用户目录页(列出他人姓名/手机),
      // FEATURE_KEYS.PROFILE 含客户/团主 → 普通用户可点入=隐私泄露。自我编辑统一走「账号资料」(info-edit)。
      // 用户目录的管理层入口另在 W4/D-1 按管理层门控重建。
      // #F6：「账号资料」列表入口已删——与头像卡「编辑」笔(onNavigateTo→info-edit)重复，保留笔为唯一入口。
      { name: '用户审核', icon: 'user-setting', type: 'userReview', url: '/pages/userReview/index', feature: FEATURE_KEYS.USER_REVIEW },
      { name: '团主资料', icon: 'usergroup', type: 'tourGuides', url: '/pages/tourGuides/index', feature: FEATURE_KEYS.TOUR_GUIDES },
      // 「供应商资料」入口已移进「商品库」页（D-4/B5：供应商是团主管理商品的上游，归商品域）。
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

    // 名称显示用户本名（辨识账号改用名旁「复制ID」按钮，见 onCopyOpenId）。
    const rawName = String(profile.displayName || '').trim();

    return {
      name: rawName || '微信用户',
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

  // 复制当前账号 openId，方便对账/DEBUG（配 authLogin env自检日志、OWNER_OPENIDS 白名单用）。
  onCopyOpenId() {
    const profile = AuthService.getRealProfile();
    const openId = (profile && profile.openId) || '';
    if (!openId) {
      wx.showToast({ title: '当前无账号ID', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: openId,
      success: () => wx.showToast({ title: '已复制账号ID', icon: 'success' }),
    });
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
    // 头像卡「编辑」图标 → 统一走「账号资料」(info-edit) 唯一自我编辑入口(归并决策·已定)。
    // 原先导向 pages/profile/edit(#17,归管理端)/pages/profile 用户目录(泄露),均已弃用。
    this.openUrl('/pages/my/info-edit/index');
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
    const loginRequiredTypes = ['tourGuides', 'dataCenter', 'userReview', 'operationLogs', 'providerApply', 'rolePreview'];
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
    // 供应商入口已移进「商品库」页（D-4），此处不再处理 type === 'providers'。
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
