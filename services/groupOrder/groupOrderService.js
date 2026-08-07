import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { MemberOrderStatus } from '~/enum/MemberOrderStatus';
import { GroupOrderRepository } from '~/repositories/groupOrderRepository';
import { CustomerOrderRepository } from '~/repositories/customerOrderRepository';
import { AuthService } from '~/services/auth/authService';
import { normalizeProductImageFields } from '~/utils/productImage';
import { filterFormalProducts } from '~/utils/productContent';

const normalizeNumber = value => Number(value || 0);

const roundMoney = value => Math.round(Number(value || 0) * 100) / 100;
// 完整列出每一档「数量+总价」，跟设置商品时的填写口径一致（不算单价区间），同 #C1 口径。
const getProductPriceDisplay = (product) => {
  const tierLabels = (product.priceSetting || [])
    .filter(rule => normalizeNumber(rule.minQuantity) > 0)
    .sort((a, b) => normalizeNumber(a.minQuantity) - normalizeNumber(b.minQuantity))
    .map(rule => `${normalizeNumber(rule.minQuantity)}件 ¥${roundMoney(rule.totalPrice)}`);
  return tierLabels.length === 0 ? '未设置价格' : tierLabels.join(' / ');
};
const parseDateTime = value => {
  if (!value) return 0;
  const safeText = String(value).trim().replace(' ', 'T');
  const time = new Date(safeText).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const validateDateWindow = (startAt, endAt) => {
  // 本系统定位为团主记账+出团基本信息记录，日期不做顺序/过期防呆
  // （可补记已过去的团单）；仅校验格式，避免存入无法解析的日期。
  // 客户下单时的「已停止收单」拦截另在下单/取单流程按 endAt 判定。
  const startTime = parseDateTime(startAt);
  const endTime = parseDateTime(endAt);
  if (!startTime) return '出团时间格式不正确';
  if (!endTime) return '收单截止时间格式不正确';
  return '';
};

const normalizeProduct = product => ({
  ...normalizeProductImageFields(product),
  priceDisplay: product.priceDisplay || getProductPriceDisplay(product),
});

const normalizeGroupOrder = (groupOrder) => {
  const profile = AuthService.getCurrentProfile();
  const session = AuthService.getCurrentSession();
  const productList = AuthService.isFormalSession(profile, session)
    ? filterFormalProducts(groupOrder.productList || [])
    : (groupOrder.productList || []);
  return {
    ...groupOrder,
    productList: productList.map(normalizeProduct),
  };
};

export const GroupOrderService = {
  storageKey: GroupOrderRepository.storageKey,

  async listVisible(filters = {}) {
    const result = filters.keyword || Number(filters.status || 0)
      ? await GroupOrderRepository.filterVisible(filters.keyword, filters.status)
      : await GroupOrderRepository.listVisible();
    if (!result.success) return result;
    return {
      ...result,
      data: result.data.map(normalizeGroupOrder),
    };
  },

  // 团单列表带聚合（A-1）：为每个可见团单 join 客户订单，算 人数/已收/应收。
  // 客户订单按当前角色 listVisible 收敛（管理者=全团口径；客户仅自己那单，故页面对客户不显金额）。
  // 聚合口径与 customerOrderService.getGroupOrderDetail 保持一致（应收=非取消合计；已收=已确认 confirmedAmount）。
  async listVisibleWithStats(filters = {}) {
    const result = await this.listVisible(filters);
    if (!result.success) return result;
    const orderRes = await CustomerOrderRepository.listVisible();
    const orders = orderRes.success ? (orderRes.data || []) : [];
    const statsByGroup = new Map();
    orders.forEach((order) => {
      const key = String(order.groupOrderId);
      const stat = statsByGroup.get(key) || { totalReceivable: 0, totalReceived: 0, totalCustomers: 0 };
      stat.totalCustomers += 1;
      if (Number(order.status) !== MemberOrderStatus.CANCELLED) {
        stat.totalReceivable += normalizeNumber(order.totalPrice);
      }
      if (Number(order.status) === MemberOrderStatus.CONFIRMED) {
        stat.totalReceived += normalizeNumber(order.confirmedAmount || order.totalPrice);
      }
      statsByGroup.set(key, stat);
    });
    return {
      ...result,
      data: result.data.map((groupOrder) => {
        const stat = statsByGroup.get(String(groupOrder.id))
          || { totalReceivable: 0, totalReceived: 0, totalCustomers: 0 };
        return { ...groupOrder, ...stat };
      }),
    };
  },

  async getById(id) {
    const result = await GroupOrderRepository.getById(id);
    if (!result.success) return result;
    return {
      ...result,
      data: normalizeGroupOrder(result.data),
    };
  },

  validate(groupOrder) {
    if (!String(groupOrder.title || '').trim()) return '请输入团单名称';
    if (String(groupOrder.title || '').trim().length > 20) return '团单名称最多 20 个字';
    if (String(groupOrder.description || '').trim().length > 200) return '团单描述最多 200 个字';
    if (!String(groupOrder.startAt || '').trim()) return '请输入出团或活动时间';
    if (!String(groupOrder.endAt || '').trim()) return '请输入收单截止时间';
    const dateWindowError = validateDateWindow(groupOrder.startAt, groupOrder.endAt);
    if (dateWindowError) return dateWindowError;
    // 取货/付款/联系人/联系电话 4 栏位已按需求移除（不再必填）。
    return '';
  },

  normalizePayload(groupOrder) {
    return {
      ...groupOrder,
      title: String(groupOrder.title || '').trim(),
      description: String(groupOrder.description || '').trim(),
      startAt: String(groupOrder.startAt || '').trim(),
      endAt: String(groupOrder.endAt || '').trim(),
      pickupNote: String(groupOrder.pickupNote || '').trim(),
      paymentNote: String(groupOrder.paymentNote || '').trim(),
      contactName: String(groupOrder.contactName || '').trim(),
      contactPhone: String(groupOrder.contactPhone || '').trim(),
      customerNotice: String(groupOrder.customerNotice || '').trim(),
      status: Number(groupOrder.status || GroupOrderStatus.OPEN),
      productList: (groupOrder.productList || []).map(normalizeProduct),
    };
  },

  async create(groupOrder) {
    const payload = this.normalizePayload(groupOrder);
    const error = this.validate(payload);
    if (error) return { success: false, error };
    return GroupOrderRepository.create(payload);
  },

  async update(id, groupOrder) {
    const payload = this.normalizePayload(groupOrder);
    const error = this.validate(payload);
    if (error) return { success: false, error };
    return GroupOrderRepository.update(id, payload);
  },

  async addProducts(groupOrderId, products) {
    return GroupOrderRepository.addProducts(groupOrderId, (products || []).map(normalizeProduct));
  },

  async removeProduct(groupOrderId, productId) {
    return GroupOrderRepository.removeProduct(groupOrderId, productId);
  },
};
