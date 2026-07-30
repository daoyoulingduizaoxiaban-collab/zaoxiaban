import useToastBehavior from '~/behaviors/useToast';
import { AuthService } from '~/services/auth/authService';
import { isCloudBusinessEnabled } from '~/repositories/cloudBusinessRepository';
import { navigateByUrl } from '~/utils/navigation';

Page({
  behaviors: [useToastBehavior],
  data: {
    menuData: [],
    isLoggedIn: false,
  },

  async onLoad() {
    await AuthService.refreshSession();
    this.refreshSettingState();
  },

  async onShow() {
    await AuthService.refreshSession();
    this.refreshSettingState();
  },

  getDataModeNote(profile, session, cloudEnabled) {
    if (profile && cloudEnabled && session && session.cloudOpenIdVerified) {
      return '资料会同步保存';
    }
    if (profile && (profile.isMockOpenId || (session && session.qaOverride))) {
      return '资料已保存';
    }
    return '请登录后查看资料保存状态';
  },

  getCloudSettingNote(session) {
    if (session && session.cloudOpenIdVerified) return '账号已完成微信登录验证';
    if (session && (session.qaOverride || session.isMockOpenId)) return '请完成微信登录后同步账号资料';
    return '请先登录账号';
  },

  refreshSettingState() {
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const cloudEnabled = isCloudBusinessEnabled();
    if (!profile) {
      this.setData({
        isLoggedIn: false,
        menuData: [],
      });
      return;
    }

    const menuData = [
      [
        {
          title: '当前角色',
          note: `${profile.displayName}｜${profile.roleLabel}`,
          icon: 'user',
        },
        {
          title: '资料保存',
          note: this.getDataModeNote(profile, session, cloudEnabled),
          icon: 'server',
        },
      ],
    ];

    // 「账号资料」入口不放这里——「我的」头像卡编辑笔是唯一自我编辑入口（#F6 归并决策）。
    menuData.push([
      {
        title: '微信账号',
        note: this.getCloudSettingNote(session),
        icon: 'cloud',
      },
      {
        title: '权限管理',
        note: '首次登录需管理员审核；团主、客户与管理员按角色开放功能',
        icon: 'secured',
      },
    ]);

    this.setData({
      isLoggedIn: true,
      menuData,
    });
  },

  onEleClick(e) {
    const { title, note, url } = e.currentTarget.dataset.data;
    if (url) {
      navigateByUrl(url, {
        fail: () => wx.showToast({ title: '打开账号资料失败', icon: 'none' }),
      });
      return;
    }
    this.onShowToast('#t-toast', `${title}：${note}`);
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/setting/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },
});
