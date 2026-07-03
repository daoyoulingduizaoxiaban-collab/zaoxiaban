import useToastBehavior from '~/behaviors/useToast';
import { AuthService } from '~/services/auth/authService';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';

Page({
  behaviors: [useToastBehavior],
  data: {
    menuData: [],
    isLoggedIn: false,
  },

  onLoad() {
    this.refreshSettingState();
  },

  onShow() {
    this.refreshSettingState();
  },

  getDataModeNote(profile, session, cloudEnabled) {
    if (profile && cloudEnabled && session && session.cloudOpenIdVerified) {
      return '正式微信云端保存';
    }
    if (profile && (profile.isMockOpenId || (session && session.qaOverride))) {
      return '当前未连接微信云端保存';
    }
    return '请登录后查看资料保存状态';
  },

  getCloudSettingNote(session) {
    if (session && session.cloudOpenIdVerified) return '账号已完成微信登录验证';
    if (session && (session.qaOverride || session.isMockOpenId)) return '当前未连接微信云端';
    return '请先登录账号';
  },

  refreshSettingState() {
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const cloudEnabled = isCloudBusinessEnabled();
    this.setData({
      isLoggedIn: Boolean(profile),
      menuData: [
        [
          {
            title: '当前角色',
            note: profile ? `${profile.displayName}｜${profile.roleLabel}` : '未登录',
            icon: 'user',
          },
          {
            title: '资料模式',
            note: this.getDataModeNote(profile, session, cloudEnabled),
            icon: 'server',
          },
        ],
        [
          {
            title: '正式云端设置',
            note: this.getCloudSettingNote(session),
            icon: 'cloud',
          },
          {
            title: '权限管理',
            note: '导游/领队、客户、供应商可直接登录；管理员按 OpenID 白名单识别',
            icon: 'secured',
          },
        ],
      ],
    });
  },

  onEleClick(e) {
    const { title, note } = e.currentTarget.dataset.data;
    this.onShowToast('#t-toast', `${title}：${note}`);
  },

  onLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },
});
