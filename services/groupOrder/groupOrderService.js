import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { GroupOrderRepository } from '~/repositories/groupOrderRepository';

const normalizeNumber = value => Number(value || 0);

const getProductPriceDisplay = (product) => {
  const prices = (product.priceSetting || []).map(rule => normalizeNumber(rule.unitPrice)).filter(price => price > 0);
  if (prices.length === 0) return '未设置价格';
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return minPrice === maxPrice ? `¥${minPrice}` : `¥${minPrice} ~ ¥${maxPrice}`;
};

const normalizeProduct = product => ({
  ...product,
  priceDisplay: product.priceDisplay || getProductPriceDisplay(product),
});

const normalizeGroupOrder = groupOrder => ({
  ...groupOrder,
  productList: (groupOrder.productList || []).map(normalizeProduct),
});

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
    return '';
  },

  normalizePayload(groupOrder) {
    return {
      ...groupOrder,
      title: String(groupOrder.title || '').trim(),
      description: String(groupOrder.description || '').trim(),
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
