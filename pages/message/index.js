import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';

const READ_MESSAGE_KEY = 'dao_you_ling_read_messages';

const readMessageIds = () => {
  try {
    const value = wx.getStorageSync(READ_MESSAGE_KEY);
    return Array.isArray(value) ? value : [];
  } catch (err) {
    return [];
  }
};

const saveReadMessageIds = (ids) => {
  try {
    wx.setStorageSync(READ_MESSAGE_KEY, ids);
  } catch (err) {
    // Read state is a local convenience and should not block message display.
  }
};

Page({
  data: {
    messages: [],
    isLoading: false,
    disabledReason: '',
  },

  onLoad() {
    this.loadMessages();
  },

  onShow() {
    this.loadMessages();
  },

  async loadMessages() {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) {
      this.setData({
        messages: [],
        disabledReason: AuthService.getAccessStateText(profile),
      });
      return;
    }

    this.setData({ isLoading: true, disabledReason: '' });
    const res = await CustomerOrderService.listVisible();
    this.setData({ isLoading: false });
    if (!res.success) {
      this.setData({
        messages: [],
        disabledReason: res.error || '暂时无法读取消息',
      });
      return;
    }

    const readIds = readMessageIds();
    const messages = (res.data || []).map((order) => {
      const id = `order-${order.id}-${order.status}`;
      return {
        id,
        orderId: order.id,
        title: order.statusText || '客户订单更新',
        desc: `${order.customerName || '客户'}｜${order.groupOrderTitle || '团单'}｜￥${order.totalPrice || 0}`,
        isRead: readIds.includes(id),
      };
    });
    this.setData({ messages });
  },

  goCustomerOrders() {
    wx.switchTab({ url: '/pages/customerOrders/index' });
  },

  markRead(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    const readIds = Array.from(new Set([...readMessageIds(), id]));
    saveReadMessageIds(readIds);
    this.setData({
      messages: this.data.messages.map(item => (item.id === id ? { ...item, isRead: true } : item)),
    });
  },

  openOrder(e) {
    const { id, orderId } = e.currentTarget.dataset;
    if (id) this.markRead({ currentTarget: { dataset: { id } } });
    if (orderId) {
      wx.switchTab({ url: '/pages/customerOrders/index' });
    }
  },
});
