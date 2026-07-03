import { Product } from '../../models/Product';
import { ProductService } from '~/services/product/productService';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import {
  getProductStatusList,
  getProductStatusTextByValue
} from '~/enum/ProductStatus'


Page({
  data: {
    productList: [] as Product[], // 頁面顯示的清單
    allProducts: [] as Product[], // 原始完整數據（用於搜尋過濾）
    searchQuery: '',
    titleText: '商品库',
    statusOptions: getProductStatusList(),
    currentStatus: 0,
    roleScopeText: '',
    saveModeText: '',
    isLoading: false,
    canManageProducts: false,
    isLoggedIn: false,
    canUseBusiness: false,
    accessStateText: '',
    detailVisible: false,
    selectedProduct: null,
    selectedPriceRules: [],
    productStatusTextMap: {
      1: getProductStatusTextByValue(1),
      2: getProductStatusTextByValue(2)
    },
  },

  onLoad() {
    this.fetchData();
  },

  onShow() {
    this.fetchData();
  },

  async fetchData() {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) {
      this.setData({
        allProducts: [],
        productList: [],
        roleScopeText: AuthService.getAccessStateText(profile),
        saveModeText: '',
        canManageProducts: false,
        isLoggedIn: Boolean(profile),
        canUseBusiness: false,
        accessStateText: AuthService.getAccessStateText(profile),
        isLoading: false,
      });
      return;
    }

    this.setData({ isLoading: true });
    const res = await ProductService.listVisible({
      keyword: this.data.searchQuery,
      status: this.data.currentStatus,
    });

    if (!res.success) {
      wx.showToast({ title: res.error || '加载商品失败', icon: 'none' });
      this.setData({ isLoading: false });
      return;
    }

    const products = this.normalizeProducts(res.data);
    this.setData({
      allProducts: products,
      productList: products,
      roleScopeText: this.getRoleScopeText(),
      saveModeText: AuthService.getCurrentProfile() ? getSaveModeText(res.meta) : '',
      canManageProducts: this.canManageProducts(),
      isLoggedIn: Boolean(AuthService.getCurrentProfile()),
      canUseBusiness: true,
      accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
      isLoading: false,
    });
  },

  normalizeProducts(products: Product[] = []) {
    return products.map(product => ({
      ...product,
      coverUrl: product.pictureUrls && product.pictureUrls[0] ? product.pictureUrls[0] : '/static/icon_map.png',
      priceSetting: product.priceSetting || product.priceSettings || [],
    }));
  },

  // 2. 搜尋條件區塊邏輯
  onSearchInput(e: any) {
    this.setData({
      searchQuery: e.detail.value
    }, () => this.fetchData());
  },

  getRoleScopeText() {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) return AuthService.getAccessStateText(profile);
    return getRoleScopeText(profile, FEATURE_KEYS.PRODUCTS);
  },

  canManageProducts() {
    return canUseFeature(AuthService.getCurrentProfile(), FEATURE_KEYS.PRODUCT_MANAGE);
  },

  onAddProduct() {
    if (!this.canManageProducts()) {
      wx.showToast({ title: '当前角色不能新增商品', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/sub-pages/product/add/index`,
      fail: () => {
        wx.showToast({
          title: '打开商品表单失败',
          icon: 'none',
        });
      },
      events: {
        refreshList: () => {
          this.fetchData();
          wx.showToast({
            title: this.data.saveModeText,
            icon: 'none'
          });
        }
      }
    });
  },

  onEditProduct(e: any) {
    const id = String(e.currentTarget.dataset.id || '');
    if (!id || !this.canManageProducts()) {
      wx.showToast({ title: '当前角色不能编辑商品', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/sub-pages/product/add/index?id=${id}`,
      fail: () => wx.showToast({ title: '打开商品表单失败', icon: 'none' }),
      events: {
        refreshList: () => {
          this.fetchData();
        }
      }
    });
  },

  onOpenProductList() {
    wx.navigateTo({
      url: '/sub-pages/product/list/index',
      fail: () => wx.showToast({ title: '打开商品列表失败', icon: 'none' }),
    });
  },

  onOpenDetail(e: any) {
    const id = String(e.currentTarget.dataset.id);
    const product = this.data.productList.find(item => String(item.id) === id);
    if (!product) {
      wx.showToast({ title: '未找到商品详情', icon: 'none' });
      return;
    }
    this.setData({
      selectedProduct: product,
      selectedPriceRules: product.priceSetting || [],
      detailVisible: true,
    });
  },

  closeDetail() {
    this.setData({ selectedProduct: null, selectedPriceRules: [], detailVisible: false });
  },

  stopDetailTap() {},

  onImageError(e: any) {
    const id = String(e.currentTarget.dataset.id);
    const patchCover = product => (String(product.id) === id ? { ...product, coverUrl: '/static/icon_map.png' } : product);
    this.setData({
      productList: this.data.productList.map(patchCover),
      allProducts: this.data.allProducts.map(patchCover),
    });
  },

  // 3. 下架/上架切換
  async onToggleStatus(e: any) {
    const id = String(e.currentTarget.dataset.id);
    const item = this.data.allProducts.find(product => String(product.id) === id);
    if (!item) {
      wx.showToast({ title: '未找到商品', icon: 'none' });
      return;
    }

    const res = await ProductService.toggleStatus(item);
    if (!res.success) {
      wx.showToast({ title: res.error || '更新商品状态失败', icon: 'none' });
      return;
    }

    await this.fetchData();
    wx.showToast({
      title: `${getSaveModeText(res.meta)}：${getProductStatusTextByValue(res.data.status)}`,
      icon: 'none'
    });
  },

  // 3. 刪除功能
  onDelete(e: any) {
    const id = String(e.currentTarget.dataset.id);

    wx.showModal({
      title: '提示',
      content: `确定要删除此商品吗？删除后将不再展示给客户。${this.data.saveModeText}`,
      success: async (modalRes) => {
        if (modalRes.confirm) {
          const res = await ProductService.softDelete(id);
          if (!res.success) {
            wx.showToast({ title: res.error || '删除商品失败', icon: 'none' });
            return;
          }
          await this.fetchData();
          wx.showToast({ title: getSaveModeText(res.meta), icon: 'none' });
        }
      }
    });
  },

  // 監聽狀態切換
  async onStatusChange(e) {
    this.setData({
      currentStatus: e.detail.value
    }, () => this.fetchData());
  },

  onLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },
});
