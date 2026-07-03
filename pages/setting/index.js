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
    const menuData = [
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
    ];

    if (profile) {
      menuData.push([
        {
          title: '账号资料',
          note: '查看与修改名称、电话和头像',
          icon: 'edit',
          url: '/pages/my/info-edit/index',
        },
      ]);
    }

    menuData.push([
      {
        title: '正式云端设置',
        note: this.getCloudSettingNote(session),
        icon: 'cloud',
      },
      {
        title: '权限管理',
        note: '首次登录需管理员审核；导游/领队、客户与管理员按角色开放功能',
        icon: 'secured',
      },
    ]);

    this.setData({
      isLoggedIn: Boolean(profile),
      menuData,
    });
  },

  onEleClick(e) {
    const { title, note, url } = e.currentTarget.dataset.data;
    if (url) {
      wx.navigateTo({
        url,
        fail: () => wx.showToast({ title: '打开账号资料失败', icon: 'none' }),
      });
      return;
    }
    this.onShowToast('#t-toast', `${title}：${note}`);
  },

  onLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },
});
