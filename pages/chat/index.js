const app = getApp();

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
    disabledReason: '请先通过客户订单处理沟通和收款事项。',
  },

  onLoad(options) {
    try {
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (eventChannel && typeof eventChannel.on === 'function') {
        eventChannel.on('update', this.update);
      }
    } catch (err) {
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

  update({ userId, avatar, name, messages }) {
    this.setData({ userId, avatar, name, messages: [...messages] });
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
      wx.showToast({ title: '请先查看客户订单', icon: 'none' });
      return;
    }
    const { userId, messages, input: content } = this.data;
    if (!content) return;
    const socket = this.getSocket();
    if (!socket) {
      wx.showToast({ title: '请先查看客户订单', icon: 'none' });
      return;
    }
    const message = { messageId: null, from: 0, content, time: Date.now(), read: true };
    messages.push(message);
    this.setData({ input: '', messages });
    socket.send(JSON.stringify({ type: 'message', data: { userId, content } }));
    wx.nextTick(this.scrollToBottom);
  },

  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },

  onGoOrders() {
    wx.switchTab({ url: '/pages/customerOrders/index' });
  },
});
