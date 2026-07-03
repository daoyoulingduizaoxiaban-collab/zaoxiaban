import config from './config';
import Mock from './mock/index';
import createBus from './utils/eventBus';
import { AuthService } from './services/auth/authService';

if (config.isMock) {
  Mock();
}

App({
  onLaunch() {
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
  onShow() {
    AuthService.refreshSession().then((res) => {
      if (res && res.success) {
        this.globalData.userInfo = res.data.profile;
      } else {
        this.globalData.userInfo = AuthService.getCurrentProfile();
      }
    });
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
