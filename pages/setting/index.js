import useToastBehavior from '~/behaviors/useToast';
import { AuthService } from '~/services/auth/authService';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';

Page({
  behaviors: [useToastBehavior],
  data: {
    menuData: [],
  },

  onLoad() {
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
            note: cloudEnabled ? '正式微信云端保存' : '本地/QA fallback',
            icon: 'server',
          },
        ],
        [
          {
            title: '正式云端设置',
            note: session && session.cloudOpenIdVerified ? 'OpenID 已验证，云函数已接入' : '未完成正式 OpenID 验证',
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
