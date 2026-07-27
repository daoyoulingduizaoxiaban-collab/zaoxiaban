import { AuthService } from '~/services/auth/authService';
import { CustomerOrderService } from '~/services/customerOrder/customerOrderService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';

// 【消息机制说明·勿删】当前「消息」= 订单状态提醒：读用户可见订单，按订单状态(待付款/待确认/
// 已完成/已取消)在客户端现算生成提醒列表，点击跳订单。已读状态存本地 storage。
// ⚠️ 目前【没有真正的推播】(手机弹通知)。若之后要做真推送，需另立项：
//   接微信「订阅消息」(subscribeMessage 用户授权 + 模板) + 云端在订单状态变更时触发下发。
// 用户 2026-07-27 决定：真推送暂不做，先保留此注解备用。

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
const getReminderTitle = (order) => {
  const status = Number(order && order.status);
  if (status === 0) return '订单待付款提醒';
  if (status === 1) return '订单待确认提醒';
  if (status === 2) return '订单已完成提醒';
  if (status === 3) return '订单已取消提醒';
  return '订单状态提醒';
};
const getReminderDesc = (order) => {
  const title = order.groupOrderTitle || '团单';
  const price = Number(order.totalPrice || 0).toFixed(2);
  return `${order.customerName || '客户'} 提交《${title}》，金额 ¥${price}`;
};

Page({
  data: {
    messages: [],
    // 'loading' | 'ready' | 'error' | 'empty'
    pageState: 'loading',
    stateText: '',
    emptyCta: '',
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
        pageState: 'empty',
        stateText: getRoleScopeText(profile, FEATURE_KEYS.MESSAGE),
        emptyCta: '',
      });
      return;
    }

    this.setData({ pageState: 'loading', stateText: '' });
    const res = await CustomerOrderService.listVisible();
    if (!res.success) {
      this.setData({
        messages: [],
        pageState: 'error',
        stateText: res.error || '暂时无法读取消息',
      });
      return;
    }

    const readIds = readMessageIds();
    const messages = (res.data || []).map((order) => {
      const id = `order-${order.id}-${order.status}`;
      return {
        id,
        orderId: order.id,
        title: getReminderTitle(order),
        desc: getReminderDesc(order),
        isRead: readIds.includes(id),
      };
    });
    this.setData({
      messages,
      pageState: messages.length ? 'ready' : 'empty',
      stateText: messages.length ? '' : '暂无订单提醒',
      emptyCta: messages.length ? '' : '前往订单中心',
    });
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
    if (orderId) {
      navigateByUrl(`/pages/customerOrders/index?orderId=${encodeURIComponent(String(orderId))}&fromMessage=1`, {
        fail: () => wx.showToast({ title: '打开订单详情失败', icon: 'none' }),
      });
    }
  },
});
