import { ProductStatus } from '~/enum/ProductStatus';
import { ProductRepository } from '~/repositories/productRepository';
import { isCloudBusinessEnabled, uploadProductImages } from '~/repositories/cloudBusinessRepository';

const normalizeNumber = value => Number(value || 0);

export const calculatePriceRule = rule => ({
  minQuantity: normalizeNumber(rule.minQuantity),
  unitPrice: normalizeNumber(rule.unitPrice),
  totalPrice: normalizeNumber(rule.minQuantity) * normalizeNumber(rule.unitPrice),
  description: rule.description || '',
});

export const getProductPriceDisplay = (priceSetting = []) => {
  const prices = priceSetting.map(rule => Number(rule.unitPrice)).filter(price => price > 0);
  if (prices.length === 0) return '未设置价格';
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return minPrice === maxPrice ? `¥${minPrice}` : `¥${minPrice} ~ ¥${maxPrice}`;
};

const normalizeProduct = product => ({
  ...product,
  priceDisplay: getProductPriceDisplay(product.priceSetting || []),
});

export const ProductService = {
  async listVisible(filters = {}) {
    const result = await ProductRepository.filterVisible(filters);
    return {
      ...result,
      data: result.data.map(normalizeProduct),
    };
  },

  validateProduct(product) {
    if (!String(product.title || '').trim()) return '请输入商品名称';
    if (!String(product.description || '').trim()) return '请输入商品描述';
    if (!String(product.sourceNote || '').trim()) return '请输入供应来源或备注';
    if (!Array.isArray(product.priceSetting) || product.priceSetting.length === 0) return '请至少设置一组价格';
    const invalidRule = product.priceSetting.find(rule => Number(rule.minQuantity) <= 0 || Number(rule.unitPrice) <= 0);
    if (invalidRule) return '价格规则需包含有效起订量和单价';
    return '';
  },

  async create(product) {
    let pictureUrls = product.pictureUrls || [];
    if (isCloudBusinessEnabled() && pictureUrls.length) {
      const uploadResult = await uploadProductImages(pictureUrls);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || '商品图片上传失败，已停止保存' };
      }
      pictureUrls = uploadResult.data;
    }

    const normalizedProduct = {
      ...product,
      pictureUrls,
      title: String(product.title || '').trim(),
      description: String(product.description || '').trim(),
      sourceNote: String(product.sourceNote || '').trim(),
      status: Number(product.status || ProductStatus.PUBLISHED),
      priceSetting: (product.priceSetting || []).map(calculatePriceRule),
    };
    const error = this.validateProduct(normalizedProduct);
    if (error) return { success: false, error };

    const result = await ProductRepository.create(normalizedProduct);
    if (!result.success) return result;
    return {
      ...result,
      data: normalizeProduct(result.data),
    };
  },

  async toggleStatus(product) {
    const nextStatus = Number(product.status) === ProductStatus.PUBLISHED
      ? ProductStatus.UNPUBLISHED
      : ProductStatus.PUBLISHED;
    const result = await ProductRepository.updateStatus(product.id, nextStatus);
    if (!result.success) return result;
    return {
      ...result,
      data: normalizeProduct(result.data),
    };
  },

  async softDelete(id) {
    return ProductRepository.softDelete(id);
  },
};
