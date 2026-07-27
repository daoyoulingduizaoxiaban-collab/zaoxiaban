import config from '~/config';
import createBus from '~/utils/eventBus';
import { AuthService } from '~/services/auth/authService';
import { setLocalIdentity } from '~/services/auth/localIdentity';

// 本地测试：扫码/启动带 ?tester=xxx 时记为该测试身份（DEV+local 才生效；见 localIdentity）。
const applyTesterQuery = (options) => {
  const tester = options && options.query && options.query.tester;
  if (tester) setLocalIdentity(tester);
};

App({
  onLaunch(options) {
    applyTesterQuery(options);
    if (config.cloudEnvId && wx.cloud && wx.cloud.init) {
      wx.cloud.init({
        env: config.cloudEnvId,
        traceUser: true,
      });
    }

    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate(() => {});

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });

    this.setUnreadNum(0);
  },
  onShow(options) {
    applyTesterQuery(options);
    AuthService.refreshSession().then((res) => {
      if (res && res.success) {
        this.globalData.userInfo = res.data.profile;
      } else {
        this.globalData.userInfo = AuthService.getCurrentProfile();
      }
    });
  },
  onShareAppMessage() {
    return {
      title: '导游领队早下班',
      path: '/pages/my/index',
    };
  },
  globalData: {
    userInfo: null,
    unreadNum: 0,
    socket: null,
    themeColor: '#0052d9'
  },

  checkUserStatus: function () {
    return AuthService.canUseBusiness();
  },

  eventBus: createBus(),

  setUnreadNum(unreadNum) {
    this.globalData.unreadNum = unreadNum;
    this.eventBus.emit('unread-num-change', unreadNum);
  },
});
