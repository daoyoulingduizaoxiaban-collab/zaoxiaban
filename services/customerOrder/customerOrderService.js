import { MemberOrderStatus } from '~/enum/MemberOrderStatus';
import { ProductStatus } from '~/enum/ProductStatus';
import { CustomerOrderRepository } from '~/repositories/customerOrderRepository';
import { isCloudBusinessEnabled, uploadCloudFiles } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { canManageGroupOrder } from '~/services/auth/roleScope';
import { normalizeProductImageFields } from '~/utils/productImage';
import { filterFormalProducts } from '~/utils/productContent';
import { getProductPriceDisplay } from '~/utils/priceDisplay';
import { getDeclaredAmountError, getConfirmedAmountError, hasInitialPayment } from '~/services/customerOrder/orderAmount';

const normalizeNumber = value => Number(value || 0);
const trimText = value => String(value || '').trim();
// 金额按「分」四舍五入，避免小数单价（如总价500/6件=83.333…）算出 499.9999… 的浮点垃圾。
const roundMoney = value => Math.round(Number(value || 0) * 100) / 100;

// 最优组合计价：价格档可以任意次数混搭凑出目标数量（第一档固定 1 件，任何数量都凑得出来），
// 取总价最低的组合——例如 1件10、2件18、3件16，买 5 件是 3件+2件=34，不是硬套单一档。
// 标准的「无限背包/凑数最低成本」DP：dp[q] = 凑出 q 件的最低总价，choice[q] 记录最后一步用了哪一档，
// 算完往回推，还原出组合里每一档各用了几次。
const getOptimalCombo = (priceSetting = [], quantity = 0) => {
  const count = normalizeNumber(quantity);
  const tiers = (priceSetting || [])
    .map(rule => ({
      minQuantity: normalizeNumber(rule.minQuantity),
      totalPrice: rule.totalPrice != null ? normalizeNumber(rule.totalPrice) : normalizeNumber(rule.minQuantity) * normalizeNumber(rule.unitPrice),
    }))
    .filter(rule => rule.minQuantity > 0 && rule.totalPrice > 0);
  if (count <= 0 || !tiers.length) return null;

  const dp = new Array(count + 1).fill(Infinity);
  const choice = new Array(count + 1).fill(-1);
  dp[0] = 0;
  for (let q = 1; q <= count; q += 1) {
    tiers.forEach((tier, tierIndex) => {
      if (tier.minQuantity > q) return;
      const candidate = dp[q - tier.minQuantity] + tier.totalPrice;
      if (candidate < dp[q]) {
        dp[q] = candidate;
        choice[q] = tierIndex;
      }
    });
  }
  if (!Number.isFinite(dp[count])) return null;

  const usage = new Map();
  let remaining = count;
  while (remaining > 0) {
    const tierIndex = choice[remaining];
    if (tierIndex === -1) break;
    usage.set(tierIndex, (usage.get(tierIndex) || 0) + 1);
    remaining -= tiers[tierIndex].minQuantity;
  }
  const parts = [...usage.entries()]
    .map(([tierIndex, times]) => ({ minQuantity: tiers[tierIndex].minQuantity, totalPrice: tiers[tierIndex].totalPrice, times }))
    .sort((a, b) => b.minQuantity - a.minQuantity);

  return { totalPrice: roundMoney(dp[count]), parts };
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

    const combo = getOptimalCombo(product.priceSetting || [], count);
    if (!combo) {
      return {
        ...product,
        quantity: count,
        unitPrice: 0,
        lineTotal: 0,
        selectedRuleText: '未设置有效价格',
      };
    }
    const comboText = combo.parts.map(part => `${part.times}×(${part.minQuantity}件¥${part.totalPrice})`).join(' + ');
    return {
      ...product,
      quantity: count,
      unitPrice: roundMoney(combo.totalPrice / count),
      lineTotal: combo.totalPrice,
      selectedRuleText: combo.parts.length > 1 ? `最优组合：${comboText} = ¥${combo.totalPrice}` : `按 ${combo.parts[0].minQuantity} 件 ¥${combo.parts[0].totalPrice}${combo.parts[0].times > 1 ? ` ×${combo.parts[0].times}` : ''}`,
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
    // A6：付款凭证选填，不能因为没传图就挡住「已付款+填了付款方式」的声明。
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
      // 与云端 create 同口径：算不算「已声明付款」只看付款方式，不看凭证张数。
      // 从前这里看凭证张数，只填付款方式不传图时云端建成 PAID、前端却送空申报额，两边对不上。
      declaredAmount: hasInitialPayment(payload) ? normalizeNumber(payload.totalPrice) : '',
      totalPrice: normalizeNumber(payload.totalPrice),
    }, { shareToken });
  },

  async declarePaid(id, payload = {}) {
    const paymentMethod = trimText(payload.paymentMethod);
    const paymentRemark = trimText(payload.paymentRemark);
    const declaredAmount = normalizeNumber(payload.declaredAmount);
    let paymentProofUrls = payload.paymentProofUrls || [];

    // payload 带了 totalPrice 才比得了上限；没带就只验「金额有效」，上限交由云端权威版兜底。
    const declaredAmountError = getDeclaredAmountError({ totalPrice: payload.totalPrice }, payload.declaredAmount);
    if (declaredAmountError) {
      return { success: false, error: declaredAmountError };
    }
    if (!paymentMethod) {
      return { success: false, error: '请填写付款方式' };
    }
    // A6：付款凭证选填，没图不得阻止声明（线下现金/转账常常没有截图）。

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
    // 同上：payload 带了 declaredAmount/totalPrice 才比得了上限。
    const confirmedAmountError = getConfirmedAmountError(payload, payload.confirmedAmount);
    if (confirmedAmountError) {
      return { success: false, error: confirmedAmountError };
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
