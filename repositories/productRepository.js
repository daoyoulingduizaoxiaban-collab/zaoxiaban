import { Product } from '~/models/Product';
import { ProductStatus } from '~/enum/ProductStatus';
import { QaSeedMock } from '~/mock/qaSeed';
import { AuthService } from '~/services/auth/authService';
import { canManageProduct, filterProductsByRole } from '~/services/auth/roleScope';

const PRODUCT_STORAGE_KEY = 'dao_you_ling_local_products';

const nowIso = () => new Date().toISOString();

const getStoredProducts = () => {
  try {
    const stored = wx.getStorageSync(PRODUCT_STORAGE_KEY);
    if (stored && Array.isArray(stored.products)) {
      return stored.products.map(item => new Product(item));
    }
  } catch (err) {
    // Fall back to QA seed when local storage is unavailable.
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

  async listVisible() {
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

  async create(productData) {
    const profile = AuthService.getCurrentProfile();
    if (!profile || !['guide', 'owner', 'admin', 'provider'].includes(profile.role)) {
      return { success: false, error: '当前角色不能新增商品' };
    }

    const allProducts = getAllProducts();
    const createdAt = nowIso();
    const nextProduct = new Product({
      ...productData,
      id: Date.now(),
      ownerUserId: productData.ownerUserId || profile.id,
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

  async softDelete(id) {
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
