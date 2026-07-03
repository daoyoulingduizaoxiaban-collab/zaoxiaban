// app.js
import config from './config';
import Mock from './mock/index';
import createBus from './utils/eventBus';
import { AuthService } from './services/auth/authService';
import {
  connectSocket,
  fetchUnreadNum
} from './mock/chat';

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

    updateManager.onCheckForUpdate((res) => {
      // console.log(res.hasUpdate)
    });

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

    this.getUnreadNum();
    // this.connect();
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
    unreadNum: 0, // 未读消息数量
    socket: null, // SocketTask 对象
    themeColor: '#0052d9' // 統一管理你的品牌色
  },

  /** 全局自定義函數：可以被各個頁面調用 */
  checkUserStatus: function () {
    // 檢查用戶權限的邏輯
    return true;
  },

  /** 全局事件总线 */
  eventBus: createBus(),

  /** 初始化WebSocket */
  connect() {
    const socket = connectSocket();
    socket.onMessage((data) => {
      data = JSON.parse(data);
      if (data.type === 'message' && !data.data.message.read)
        this.setUnreadNum(this.globalData.unreadNum + 1);
    });
    this.globalData.socket = socket;
  },

  /** 获取未读消息数量 */
  getUnreadNum() {
    fetchUnreadNum().then(({
      data
    }) => {
      this.globalData.unreadNum = data;
      this.eventBus.emit('unread-num-change', data);
    });
  },

  /** 设置未读消息数量 */
  setUnreadNum(unreadNum) {
    this.globalData.unreadNum = unreadNum;
    this.eventBus.emit('unread-num-change', unreadNum);
  },
});
