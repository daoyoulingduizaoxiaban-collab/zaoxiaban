import { ProductStatus } from '~/enum/ProductStatus';
import { ProductRepository } from '~/repositories/productRepository';
import { isCloudBusinessEnabled, uploadProductImages } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';

const normalizeNumber = value => Number(value || 0);
const INTERNAL_PRODUCT_COPY_RE = /QA|mock|Seed|MVP|local|test|automation|自动化|测试|本地|后续|未完成|暂未|未开放|未启用|未串接/i;

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

const hasInternalProductCopy = (product) => {
  const fields = [
    product.title,
    product.description,
    product.sourceNote,
  ];
  return fields.some(value => INTERNAL_PRODUCT_COPY_RE.test(String(value || '')));
};

export const ProductService = {
  async listVisible(filters = {}) {
    const result = await ProductRepository.filterVisible(filters);
    if (!result.success) return result;
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const list = AuthService.isFormalSession(profile, session)
      ? result.data.filter(product => !hasInternalProductCopy(product))
      : result.data;
    return {
      ...result,
      data: list.map(normalizeProduct),
    };
  },

  async getById(id) {
    const result = await ProductRepository.getById(id);
    if (!result.success) return result;
    return {
      ...result,
      data: normalizeProduct(result.data),
    };
  },

  validateProduct(product, { requireImage = false } = {}) {
    if (!String(product.title || '').trim()) return '请输入商品名称';
    if (!String(product.description || '').trim()) return '请输入商品描述';
    if (!String(product.sourceNote || '').trim()) return '请输入供应来源或备注';
    if (requireImage && (!Array.isArray(product.pictureUrls) || product.pictureUrls.length === 0)) return '请至少上传一张商品图片';
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
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const isFormalSession = AuthService.isFormalSession(profile, session);
    if (isFormalSession && hasInternalProductCopy(normalizedProduct)) {
      return { success: false, error: '商品资料不能包含内部测试文字' };
    }
    const error = this.validateProduct(normalizedProduct, { requireImage: isFormalSession });
    if (error) return { success: false, error };

    const result = await ProductRepository.create(normalizedProduct);
    if (!result.success) return result;
    return {
      ...result,
      data: normalizeProduct(result.data),
    };
  },

  async update(product) {
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
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const isFormalSession = AuthService.isFormalSession(profile, session);
    if (isFormalSession && hasInternalProductCopy(normalizedProduct)) {
      return { success: false, error: '商品资料不能包含内部测试文字' };
    }
    const error = this.validateProduct(normalizedProduct, { requireImage: isFormalSession });
    if (error) return { success: false, error };

    const result = await ProductRepository.update(normalizedProduct);
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
