import { navigateByUrl } from '~/utils/navigation';

const app = getApp();
const DEFAULT_DISABLED_REASON = '此页为订单公告页，不提供实时聊天。';

Page({
  data: {
    myAvatar: '/static/chat/avatar.png',
    userId: null,
    avatar: '',
    name: '',
    messages: [],
    input: '',
    anchor: '',
    keyboardHeight: 0,
    disabledReason: DEFAULT_DISABLED_REASON,
  },

  onLoad() {
    try {
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (eventChannel && typeof eventChannel.on === 'function') {
        eventChannel.on('update', this.update);
        return;
      }
      this.setData({ disabledReason: DEFAULT_DISABLED_REASON });
    } catch (err) {
      this.setData({ disabledReason: DEFAULT_DISABLED_REASON });
      wx.showToast({ title: '未找到沟通对象', icon: 'none' });
    }
  },

  onReady() {},

  onShow() {},

  onHide() {},

  onUnload() {
    app.eventBus.off('update', this.update);
  },

  onPullDownRefresh() {},

  onReachBottom() {},

  onShareAppMessage() {},

  update(payload = {}) {
    const { userId, avatar = '', name = '客户沟通', messages = [] } = payload;
    const hasContact = Boolean(userId);
    this.setData({
      userId: hasContact ? userId : null,
      avatar,
      name,
      messages: Array.isArray(messages) ? [...messages] : [],
      disabledReason: DEFAULT_DISABLED_REASON,
    });
    wx.nextTick(this.scrollToBottom);
  },

  handleKeyboardHeightChange(event) {
    const { height } = event.detail;
    if (!height) return;
    this.setData({ keyboardHeight: height });
    wx.nextTick(this.scrollToBottom);
  },

  handleBlur() {
    this.setData({ keyboardHeight: 0 });
  },

  handleInput(event) {
    this.setData({ input: event.detail.value });
  },

  getSocket() {
    const socket = app.globalData && app.globalData.socket;
    if (!socket || typeof socket.send !== 'function') {
      return null;
    }
    return socket;
  },

  sendMessage() {
    if (this.data.disabledReason) {
      wx.showToast({ title: '订单公告页不支持发送消息', icon: 'none' });
      return;
    }
    const { userId, messages, input } = this.data;
    const content = String(input || '').trim();
    if (!content) return;
    const socket = this.getSocket();
    if (!socket) {
      wx.showToast({ title: '订单公告页暂未接通实时通道', icon: 'none' });
      return;
    }
    const message = { messageId: null, from: 0, content, time: Date.now(), read: true };
    this.setData({ input: '', messages: [...messages, message] });
    socket.send(JSON.stringify({ type: 'message', data: { userId, content } }));
    wx.nextTick(this.scrollToBottom);
  },

  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },

  onGoOrders() {
    navigateByUrl('/pages/customerOrders/index');
  },
});
