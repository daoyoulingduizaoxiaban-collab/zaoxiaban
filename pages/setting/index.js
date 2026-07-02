import useToastBehavior from '~/behaviors/useToast';
import { AuthService } from '~/services/auth/authService';

Page({
  behaviors: [useToastBehavior],
  data: {
    menuData: [],
  },

  onLoad() {
    const profile = AuthService.getCurrentProfile();
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
            note: '本地/QA 展示模式，尚未正式保存到云端',
            icon: 'server',
          },
        ],
        [
          {
            title: '正式云端设置',
            note: 'Phase 8 后接入',
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
