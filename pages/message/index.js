import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';

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
    return false;
  }
  return true;
};

Page({
  data: {
    messages: [],
    isLoading: false,
    disabledReason: '',
    detailVisible: false,
    selectedMessage: null,
  },

  onLoad() {
    this.loadMessages();
  },

  async onShow() {
    await AuthService.refreshSession();
    this.loadMessages();
  },

  async loadMessages() {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.MESSAGE)) {
      this.setData({
        messages: [],
        disabledReason: getRoleScopeText(profile, FEATURE_KEYS.MESSAGE),
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
    navigateByUrl('/pages/customerOrders/index');
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
    const selectedMessage = this.data.messages.find(item => item.id === id) || null;
    this.setData({ detailVisible: Boolean(selectedMessage), selectedMessage });
    if (orderId) {
      navigateByUrl(`/pages/customerOrders/index?orderId=${encodeURIComponent(String(orderId))}&fromMessage=1`, {
        fail: () => wx.showToast({ title: '打开订单详情失败', icon: 'none' }),
      });
    }
  },

  closeMessageDetail() {
    this.setData({ detailVisible: false, selectedMessage: null });
  },

  stopMessageDetailTap() {},
});
