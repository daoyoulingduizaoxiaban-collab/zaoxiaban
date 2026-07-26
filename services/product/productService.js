import { ProductStatus } from '~/enum/ProductStatus';
import { ProductRepository } from '~/repositories/productRepository';
import { DirectoryRepository } from '~/repositories/directoryRepository';
import { isCloudBusinessEnabled, uploadProductImages } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { normalizeProductImageFields } from '~/utils/productImage';
import { filterFormalProducts, hasInternalProductCopy, normalizeFormalProductCopy } from '~/utils/productContent';

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

const normalizeProduct = (product) => {
  const displayProduct = normalizeFormalProductCopy(product);
  const normalizedImage = normalizeProductImageFields(displayProduct);
  return {
    ...normalizedImage,
    priceSetting: displayProduct.priceSetting || displayProduct.priceSettings || [],
    priceDisplay: getProductPriceDisplay(displayProduct.priceSetting || displayProduct.priceSettings || []),
  };
};

export const ProductService = {
  async listPublic(filters = {}) {
    const result = await ProductRepository.listPublic(filters);
    if (!result.success) return result;
    const list = filterFormalProducts(result.data || []);
    return {
      ...result,
      data: list.map(normalizeProduct),
    };
  },

  async listVisible(filters = {}) {
    const result = await ProductRepository.filterVisible(filters);
    if (!result.success) return result;
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    const list = AuthService.isFormalSession(profile, session)
      ? filterFormalProducts(result.data || [])
      : (result.data || []);
    return {
      ...result,
      data: list.map(normalizeProduct),
    };
  },

  // 选品取数（团单 add / product-picker 专用）：仅返回「上架」商品（C4：下架不得进入新团单）。
  // D-6：叠加「供应商有效」过滤——供应商已停用/软删除的商品不得进入新团单；
  // 无 providerId（团主自建）的商品不受此限。历史订单已落库，不受影响。
  async listSelectable(filters = {}) {
    const result = await this.listVisible(filters);
    if (!result.success) return result;
    const published = (result.data || []).filter(product => Number(product.status) === ProductStatus.PUBLISHED);
    const statusRes = await DirectoryRepository.getProviderStatusMap();
    const providerActiveMap = statusRes.success ? (statusRes.data || {}) : {};
    return {
      ...result,
      data: published.filter((product) => {
        const providerId = product.providerId ? String(product.providerId) : '';
        if (!providerId) return true;
        // 状态图查不到该供应商时保守放行（避免误伤既有商品）；仅在明确停用/软删时过滤。
        return providerActiveMap[providerId] !== false;
      }),
    };
  },

  async getById(id) {
    const result = await ProductRepository.getById(id);
    if (!result.success) return result;
    const profile = AuthService.getCurrentProfile();
    const session = AuthService.getCurrentSession();
    if (AuthService.isFormalSession(profile, session) && hasInternalProductCopy(result.data)) {
      return { success: false, error: '未找到商品资料' };
    }
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
      return { success: false, error: '商品资料包含不适合公开展示的文字，请调整后保存' };
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
      return { success: false, error: '商品资料包含不适合公开展示的文字，请调整后保存' };
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
