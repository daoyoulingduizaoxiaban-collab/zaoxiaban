import { MemberOrderStatus } from '~/enum/MemberOrderStatus';
import { ProductStatus } from '~/enum/ProductStatus';
import { CustomerOrderRepository } from '~/repositories/customerOrderRepository';
import { isCloudBusinessEnabled, uploadCloudFiles } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { canManageGroupOrder } from '~/services/auth/roleScope';
import { normalizeProductImageFields } from '~/utils/productImage';
import { filterFormalProducts } from '~/utils/productContent';

const normalizeNumber = value => Number(value || 0);
const trimText = value => String(value || '').trim();
// 金额按「分」四舍五入，避免小数单价（如总价500/6件=83.333…）算出 499.9999… 的浮点垃圾。
const roundMoney = value => Math.round(Number(value || 0) * 100) / 100;

const getBestPriceRule = (priceSetting = [], quantity = 0) => {
  const count = normalizeNumber(quantity);
  const sortedRules = [...priceSetting]
    .map(rule => ({
      minQuantity: normalizeNumber(rule.minQuantity),
      unitPrice: normalizeNumber(rule.unitPrice),
      description: rule.description || '',
    }))
    .filter(rule => rule.minQuantity > 0 && rule.unitPrice > 0)
    .sort((a, b) => b.minQuantity - a.minQuantity);

  return sortedRules.find(rule => count >= rule.minQuantity) || sortedRules[sortedRules.length - 1] || null;
};

// 完整列出每一档「数量+总价」，跟开团/设置商品时的填写口径一致（不算单价），
// 客户下单前才看得出买多少件划算（同 groupOrder detail 页 #C1 口径）。
const getProductPriceDisplay = (product) => {
  const tierLabels = (product.priceSetting || [])
    .filter(rule => normalizeNumber(rule.minQuantity) > 0)
    .sort((a, b) => normalizeNumber(a.minQuantity) - normalizeNumber(b.minQuantity))
    .map(rule => `${normalizeNumber(rule.minQuantity)}件 ¥${roundMoney(rule.totalPrice)}`);
  return tierLabels.length === 0 ? '未设置价格' : tierLabels.join(' / ');
};

const normalizeOrderListItem = order => ({
  ...order,
  status: normalizeNumber(order.status),
  paymentStatus: normalizeNumber(order.paymentStatus !== undefined ? order.paymentStatus : order.status),
  itemCount: (order.items || order.productList || []).reduce((sum, item) => sum + normalizeNumber(item.amount || item.quantity), 0),
  historyCount: (order.paymentHistory || []).length,
});

const normalizeGroupOrderProducts = (groupOrder) => {
  const profile = AuthService.getCurrentProfile();
  const session = AuthService.getCurrentSession();
  const products = AuthService.isFormalSession(profile, session)
    ? filterFormalProducts(groupOrder.productList || [])
    : (groupOrder.productList || []);
  return products
    .filter(product => Number(product.status) === ProductStatus.PUBLISHED)
    .map(product => {
      const normalizedImage = normalizeProductImageFields(product);
      return {
        ...normalizedImage,
        quantity: 0,
        priceDisplay: getProductPriceDisplay(product),
        lineTotal: 0,
        selectedRuleText: '',
      };
    });
};

export const CustomerOrderService = {
  storageKey: CustomerOrderRepository.storageKey,

  async listVisible() {
    const result = await CustomerOrderRepository.listVisible();
    if (!result.success) return result;
    return {
      ...result,
      data: result.data.map(normalizeOrderListItem),
    };
  },

  async getById(id) {
    const result = await CustomerOrderRepository.getById(id);
    if (!result.success) return result;
    return {
      ...result,
      data: normalizeOrderListItem(result.data),
    };
  },

  async getGroupOrderDetail(groupOrderId, shareToken = '') {
    const entryResult = await CustomerOrderRepository.getGroupOrderEntry(groupOrderId, { shareToken });
    if (!entryResult.success) return entryResult;

    // 可见范围收口（A6/B1）：管理者（owner/admin/归属或授权 guide）见全团订单与收款统计；
    // 客户仅见「自己那一单」，不得看到他人订单与全团应收/已收/人数。
    const profile = AuthService.getCurrentProfile();
    const canManage = canManageGroupOrder(entryResult.data, profile);
    const profileId = profile && profile.id;

    const orderResult = await CustomerOrderRepository.listByGroupOrder(groupOrderId);
    const allMemberOrders = orderResult.success ? orderResult.data.map(normalizeOrderListItem) : [];
    const memberOrderList = canManage
      ? allMemberOrders
      : allMemberOrders.filter(order => String(order.customerUserId) === String(profileId));

    // 统计仅对管理者按全团口径计算；客户不返回全团统计（置 0，页面亦不展示）。
    const totalReceivable = canManage
      ? memberOrderList
        .filter(order => Number(order.status) !== MemberOrderStatus.CANCELLED)
        .reduce((sum, order) => sum + normalizeNumber(order.totalPrice), 0)
      : 0;
    const totalReceived = canManage
      ? memberOrderList
        .filter(order => Number(order.status) === MemberOrderStatus.CONFIRMED)
        .reduce((sum, order) => sum + normalizeNumber(order.confirmedAmount || order.totalPrice), 0)
      : 0;

    return {
      ...entryResult,
      data: {
        ...entryResult.data,
        canManageGroupOrder: canManage,
        memberOrderList,
        totalReceivable,
        totalReceived,
        totalCustomers: canManage ? memberOrderList.length : 0,
      },
    };
  },

  async getOrderEntry(groupOrderId, shareToken = '') {
    const result = await CustomerOrderRepository.getGroupOrderEntry(groupOrderId, { shareToken });
    if (!result.success) return result;

    return {
      ...result,
      data: {
        ...result.data,
        productList: normalizeGroupOrderProducts(result.data),
      },
    };
  },

  calculateLine(product, quantity) {
    const count = normalizeNumber(quantity);
    if (count <= 0) {
      return {
        ...product,
        quantity: 0,
        lineTotal: 0,
        selectedRuleText: '',
      };
    }

    const rule = getBestPriceRule(product.priceSetting || [], count);
    const unitPrice = rule ? rule.unitPrice : 0;
    return {
      ...product,
      quantity: count,
      unitPrice,
      lineTotal: roundMoney(count * unitPrice),
      selectedRuleText: rule ? `按 ${rule.description || `${rule.minQuantity} 件起`}，单价 ¥${roundMoney(unitPrice)}` : '未设置有效价格',
    };
  },

  calculateTotal(products) {
    return roundMoney((products || []).reduce((sum, product) => sum + normalizeNumber(product.lineTotal), 0));
  },

  validateCreatePayload(payload) {
    if (!payload.groupOrderId) return '缺少团单 ID';
    if (!String(payload.customerName || '').trim()) return '请输入客户姓名';
    if (!String(payload.customerPhone || '').trim()) return '请输入客户手机号';
    if (!/^1[3-9]\d{9}$/.test(String(payload.customerPhone || '').trim())) return '请输入 11 位中国大陆手机号';
    if (!Array.isArray(payload.items) || payload.items.length === 0) return '请至少选择一个商品';
    const invalidItem = payload.items.find(item => normalizeNumber(item.amount) <= 0 || normalizeNumber(item.totalPrice) <= 0);
    if (invalidItem) return '商品数量和金额必须大于 0';
    const hasPaymentMethod = Boolean(trimText(payload.paymentMethod));
    const hasPaymentProof = Array.isArray(payload.paymentProofUrls) && payload.paymentProofUrls.length > 0;
    if (hasPaymentMethod !== hasPaymentProof) return '付款方式与付款凭证需同时填写';
    return '';
  },

  async create(payload, shareToken = '') {
    const error = this.validateCreatePayload(payload);
    if (error) return { success: false, error };
    let paymentProofUrls = payload.paymentProofUrls || [];
    if (isCloudBusinessEnabled() && paymentProofUrls.length) {
      const uploadResult = await uploadCloudFiles(paymentProofUrls, 'payment-proofs');
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || '付款凭证上传失败，已停止提交' };
      }
      paymentProofUrls = uploadResult.data;
    }

    return CustomerOrderRepository.create({
      ...payload,
      customerName: String(payload.customerName || '').trim(),
      customerPhone: String(payload.customerPhone || '').trim(),
      memberRemark: String(payload.memberRemark || '').trim(),
      paymentMethod: String(payload.paymentMethod || '').trim(),
      paymentRemark: String(payload.paymentRemark || '').trim(),
      paymentProofUrls,
      declaredAmount: paymentProofUrls.length ? normalizeNumber(payload.totalPrice) : '',
      totalPrice: normalizeNumber(payload.totalPrice),
    }, { shareToken });
  },

  async declarePaid(id, payload = {}) {
    const paymentMethod = trimText(payload.paymentMethod);
    const paymentRemark = trimText(payload.paymentRemark);
    const declaredAmount = normalizeNumber(payload.declaredAmount);
    let paymentProofUrls = payload.paymentProofUrls || [];

    if (declaredAmount <= 0) {
      return { success: false, error: '请填写有效付款金额' };
    }
    if (!paymentMethod) {
      return { success: false, error: '请填写付款方式' };
    }
    if (paymentProofUrls.length === 0) {
      return { success: false, error: '请上传付款凭证' };
    }

    if (isCloudBusinessEnabled() && paymentProofUrls.length) {
      const uploadResult = await uploadCloudFiles(paymentProofUrls, 'payment-proofs');
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || '付款凭证上传失败，已停止提交' };
      }
      paymentProofUrls = uploadResult.data;
    }

    const nextPayload = {
      ...payload,
      paymentMethod,
      paymentRemark,
      declaredAmount,
      paymentProofUrls,
      note: payload.note || `客户声明已付款：￥${declaredAmount}｜${[paymentMethod, paymentRemark, paymentProofUrls.length ? `凭证 ${paymentProofUrls.length} 张` : ''].filter(Boolean).join('｜')}`,
    };
    return CustomerOrderRepository.updatePaymentStatus(id, MemberOrderStatus.PAID, nextPayload.note, nextPayload);
  },

  async confirmPayment(id, payload = {}) {
    const confirmedAmount = normalizeNumber(payload.confirmedAmount);
    if (confirmedAmount <= 0) {
      return { success: false, error: '请填写有效实收金额' };
    }

    const confirmRemark = trimText(payload.confirmRemark);
    const nextPayload = {
      ...payload,
      confirmedAmount,
      confirmRemark,
      note: payload.note || `团主确认收款：实收 ¥${confirmedAmount}${confirmRemark ? `｜${confirmRemark}` : ''}`,
    };
    return CustomerOrderRepository.updatePaymentStatus(id, MemberOrderStatus.CONFIRMED, nextPayload.note, nextPayload);
  },

  async cancelOrder(id, payload = {}) {
    const cancelRemark = trimText(payload.cancelRemark);
    const nextPayload = {
      ...payload,
      cancelRemark,
      note: payload.note || (cancelRemark ? `订单已取消：${cancelRemark}` : '订单已取消'),
    };
    return CustomerOrderRepository.updatePaymentStatus(id, MemberOrderStatus.CANCELLED, nextPayload.note, nextPayload);
  },
};
