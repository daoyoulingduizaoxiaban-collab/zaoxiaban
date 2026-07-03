import { Product } from '~/models/Product';
import { ProductStatus } from '~/enum/ProductStatus';
import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canManageProduct, canUseFeature, filterProductsByRole, hasRole } from '~/services/auth/roleScope';
import {
  callBusinessData,
  callPublicBusinessData,
  CLOUD_SAVE_MODE,
  isCloudBusinessConfigured,
  isCloudBusinessEnabled
} from './cloudBusinessRepository';

const PRODUCT_STORAGE_KEY = 'dao_you_ling_local_products';

const nowIso = () => new Date().toISOString();

const getStoredProducts = () => {
  try {
    const stored = wx.getStorageSync(PRODUCT_STORAGE_KEY);
    if (stored && Array.isArray(stored.products)) {
      return stored.products.map(item => new Product(item));
    }
  } catch (err) {
    return null;
  }
  return null;
};

const saveStoredProducts = (products) => {
  wx.setStorageSync(PRODUCT_STORAGE_KEY, {
    mode: 'local-product-repository',
    updatedAt: nowIso(),
    products,
  });
};

const getAllProducts = () => getStoredProducts() || QaSeedMock.getProducts();

export const ProductRepository = {
  storageKey: PRODUCT_STORAGE_KEY,

  async listPublic(filters = {}) {
    if (isCloudBusinessConfigured()) {
      return callPublicBusinessData({ resource: 'products', action: 'listPublic', data: filters });
    }

    const products = filterProductsByRole(getAllProducts(), null);

    return {
      success: true,
      data: products,
      meta: {
        role: '',
        authSource: '',
        isMockOpenId: false,
        saveMode: 'local-product-repository',
      },
    };
  },

  async listVisible() {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({ resource: 'products', action: 'listVisible' });
    }

    const profile = AuthService.getCurrentProfile();
    const products = filterProductsByRole(getAllProducts(), profile);

    return {
      success: true,
      data: products,
      meta: {
        role: profile && profile.role,
        authSource: profile && profile.authSource,
        isMockOpenId: Boolean(profile && profile.isMockOpenId),
        saveMode: 'local-product-repository',
      },
    };
  },

  async filterVisible({ keyword = '', status = 0 } = {}) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'listVisible',
        data: { keyword, status },
      });
    }

    const result = await this.listVisible();
    const query = String(keyword || '').trim().toLowerCase();
    const statusValue = Number(status || 0);
    const data = result.data.filter((product) => {
      const matchesQuery = !query
        || String(product.title || '').toLowerCase().includes(query)
        || String(product.description || '').toLowerCase().includes(query)
        || String(product.sourceNote || '').toLowerCase().includes(query);
      const matchesStatus = !statusValue || Number(product.status) === statusValue;
      return matchesQuery && matchesStatus;
    });

    return { ...result, data };
  },

  async getById(id) {
    const result = await this.listVisible();
    if (!result.success) return result;
    const product = (result.data || []).find(item => String(item.id || item._id) === String(id));
    return product
      ? { ...result, data: product }
      : { success: false, error: '未找到商品资料' };
  },

  async create(productData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'create',
        data: productData,
      });
    }

    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.PRODUCT_MANAGE)) {
      return { success: false, error: '当前角色不能新增商品' };
    }

    const allProducts = getAllProducts();
    const createdAt = nowIso();
    const nextProduct = new Product({
      ...productData,
      id: Date.now(),
      ownerUserId: productData.ownerUserId || profile.id,
      providerId: productData.providerId || (hasRole(profile, 'provider') ? (profile.providerId || profile.id) : ''),
      status: Number(productData.status || ProductStatus.PUBLISHED),
      createdAt,
      updatedAt: createdAt,
      deletedAt: '',
    });
    const nextProducts = [...allProducts, nextProduct];
    saveStoredProducts(nextProducts);

    return {
      success: true,
      data: nextProduct,
      meta: { saveMode: 'local-product-repository' },
    };
  },

  async updateStatus(id, status) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'updateStatus',
        data: { id, status },
      });
    }

    const profile = AuthService.getCurrentProfile();
    const allProducts = getAllProducts();
    const target = allProducts.find(product => String(product.id) === String(id));
    if (!canManageProduct(target, profile)) {
      return { success: false, error: '当前角色不能修改此商品' };
    }

    const updatedProducts = allProducts.map((product) => {
      if (String(product.id) !== String(id)) return product;
      return new Product({
        ...product,
        status: Number(status),
        updatedAt: nowIso(),
      });
    });
    saveStoredProducts(updatedProducts);

    return {
      success: true,
      data: updatedProducts.find(product => String(product.id) === String(id)),
      meta: { saveMode: 'local-product-repository' },
    };
  },

  async update(productData) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'update',
        data: productData,
      });
    }

    const profile = AuthService.getCurrentProfile();
    const allProducts = getAllProducts();
    const target = allProducts.find(product => String(product.id) === String(productData.id));
    if (!canManageProduct(target, profile)) {
      return { success: false, error: '当前角色不能修改此商品' };
    }

    const updatedAt = nowIso();
    const updatedProducts = allProducts.map((product) => {
      if (String(product.id) !== String(productData.id)) return product;
      return new Product({
        ...product,
        ...productData,
        id: product.id,
        ownerUserId: product.ownerUserId,
        providerId: product.providerId || productData.providerId || (hasRole(profile, 'provider') ? (profile.providerId || profile.id) : ''),
        status: Number(productData.status || product.status || ProductStatus.PUBLISHED),
        updatedAt,
      });
    });
    saveStoredProducts(updatedProducts);

    return {
      success: true,
      data: updatedProducts.find(product => String(product.id) === String(productData.id)),
      meta: { saveMode: 'local-product-repository' },
    };
  },

  async softDelete(id) {
    if (isCloudBusinessEnabled()) {
      return callBusinessData({
        resource: 'products',
        action: 'softDelete',
        data: { id },
      });
    }

    const profile = AuthService.getCurrentProfile();
    const allProducts = getAllProducts();
    const target = allProducts.find(product => String(product.id) === String(id));
    if (!canManageProduct(target, profile)) {
      return { success: false, error: '当前角色不能删除此商品' };
    }

    const deletedAt = nowIso();
    const updatedProducts = allProducts.map((product) => {
      if (String(product.id) !== String(id)) return product;
      return new Product({
        ...product,
        status: ProductStatus.UNPUBLISHED,
        updatedAt: deletedAt,
        deletedAt,
      });
    });
    saveStoredProducts(updatedProducts);

    return {
      success: true,
      data: updatedProducts.find(product => String(product.id) === String(id)),
      meta: { saveMode: 'local-product-repository' },
    };
  },
};

ProductRepository.cloudSaveMode = CLOUD_SAVE_MODE;
