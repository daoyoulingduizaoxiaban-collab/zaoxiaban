import useToastBehavior from '~/behaviors/useToast';
import { AuthService } from '~/services/auth/authService';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';

Page({
  behaviors: [useToastBehavior],
  data: {
    menuData: [],
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
      return '本地/QA 测试模式，不代表正式保存';
    }
    return '未完成正式 OpenID 验证，暂用本地/QA 测试模式';
  },

  getCloudSettingNote(session) {
    if (session && session.cloudOpenIdVerified) return 'OpenID 已验证，云函数已接入';
    if (session && session.qaOverride) return 'QA 身份切换中，未调用正式 OpenID';
    if (session && session.isMockOpenId) return '本地 auth adapter，正式 OpenID 未验证';
    return '未登录或未完成正式 OpenID 验证';
  },

  refreshSettingState() {
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const cloudEnabled = isCloudBusinessEnabled();
    this.setData({
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
            note: 'owner/admin 完整后台暂未开放',
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
});
