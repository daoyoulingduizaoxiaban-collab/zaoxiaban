import { Product } from '../../models/Product';
import { ProductService } from '~/services/product/productService';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { navigateByUrl } from '~/utils/navigation';
import { normalizeProductImageFields } from '~/utils/productImage';
import {
  getProductStatusList,
  getProductStatusTextByValue
} from '~/enum/ProductStatus'

Page({
  data: {
    productList: [] as Product[],
    allProducts: [] as Product[],
    searchQuery: '',
    titleText: '商品库',
    statusOptions: getProductStatusList(),
    currentStatus: 0,
    roleScopeText: '',
    saveModeText: '',
    isLoading: false,
    loadErrorText: '',
    // 商品目录区统一三态：loading / ready / error / empty
    pageState: 'loading',
    emptyText: '当前没有商品',
    emptyCta: '',
    authReady: false,
    canManageProducts: false,
    canShowProductCatalog: false,
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

  syncAccessShell() {
    const profile = AuthService.getCurrentProfile();
    const canUseBusiness = AuthService.canUseBusiness(profile);
    this.setData({
      isLoading: true,
      loadErrorText: '',
      pageState: 'loading',
      authReady: false,
      canManageProducts: canUseFeature(profile, FEATURE_KEYS.PRODUCT_MANAGE),
      canShowProductCatalog: true,
      isLoggedIn: Boolean(profile),
      canUseBusiness,
      accessStateText: AuthService.getAccessStateText(profile),
      roleScopeText: canUseBusiness
        ? getRoleScopeText(profile, FEATURE_KEYS.PRODUCTS)
        : AuthService.getAccessStateText(profile),
    });
  },

  async refreshAndFetchData() {
    if ((this as any)._refreshInFlight) return (this as any)._refreshInFlight;
    (this as any)._refreshInFlight = (async () => {
      this.syncAccessShell();
      await AuthService.refreshSession();
      await this.fetchData();
    })();
    try {
      return await (this as any)._refreshInFlight;
    } finally {
      (this as any)._refreshInFlight = null;
    }
  },

  async onLoad() {
    (this as any)._skipNextShowRefresh = true;
    await this.refreshAndFetchData();
  },

  async onShow() {
    if ((this as any)._skipNextShowRefresh) {
      (this as any)._skipNextShowRefresh = false;
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().refreshTabBar();
      }
      return;
    }
    await this.refreshAndFetchData();
  },

  resetDetailState(extraState = {}) {
    this.setData({
      detailVisible: false,
      selectedProduct: null,
      selectedPriceRules: [],
      ...extraState,
    });
  },

  async fetchData() {
    if ((this as any)._fetchInFlight) return (this as any)._fetchInFlight;
    (this as any)._fetchInFlight = (async () => {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) {
      this.setData({ isLoading: true, loadErrorText: '', pageState: 'loading' });
      const publicRes = await ProductService.listPublic({
        keyword: this.data.searchQuery,
      });
      if (!publicRes.success) {
        const errorText = publicRes.error || '加载公开商品失败';
        wx.showToast({ title: errorText, icon: 'none' });
        this.resetDetailState({
          allProducts: [],
          productList: [],
          roleScopeText: AuthService.getAccessStateText(profile),
          saveModeText: '',
          canManageProducts: false,
          canShowProductCatalog: true,
          isLoggedIn: Boolean(profile),
          canUseBusiness: false,
          accessStateText: AuthService.getAccessStateText(profile),
          authReady: true,
          isLoading: false,
          loadErrorText: errorText,
        });
        return;
      }
      const publicProducts = this.normalizeProducts(publicRes.data);
      this.resetDetailState({
        allProducts: publicProducts,
        productList: publicProducts,
        roleScopeText: profile ? AuthService.getAccessStateText(profile) : '公开商品可直接浏览，下单与管理需登录后使用。',
        saveModeText: '',
        canManageProducts: false,
        canShowProductCatalog: true,
        isLoggedIn: Boolean(profile),
        canUseBusiness: false,
        accessStateText: AuthService.getAccessStateText(profile),
        authReady: true,
        isLoading: false,
        loadErrorText: '',
        pageState: publicProducts.length ? 'ready' : 'empty',
        emptyText: '当前暂无公开商品',
        emptyCta: profile ? '' : '去登录',
      });
      return;
    }

    this.setData({ isLoading: true, loadErrorText: '', pageState: 'loading' });
    const res = await ProductService.listVisible({
      keyword: this.data.searchQuery,
      status: this.data.currentStatus,
    });

    if (!res.success) {
      const errorText = res.error || '加载商品失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.resetDetailState({
        allProducts: [],
        productList: [],
        roleScopeText: errorText,
        saveModeText: '',
        canManageProducts: this.canManageProducts(),
        canShowProductCatalog: true,
        isLoggedIn: Boolean(profile),
        canUseBusiness: true,
        accessStateText: AuthService.getAccessStateText(profile),
        authReady: true,
        isLoading: false,
        loadErrorText: errorText,
        pageState: 'error',
      });
      return;
    }

    const products = this.normalizeProducts(res.data);
    this.setData({
      allProducts: products,
      productList: products,
      roleScopeText: this.getRoleScopeText(),
      saveModeText: AuthService.getCurrentProfile() ? getSaveModeText(res.meta) : '',
      canManageProducts: this.canManageProducts(),
      canShowProductCatalog: true,
      isLoggedIn: Boolean(AuthService.getCurrentProfile()),
      canUseBusiness: true,
      accessStateText: AuthService.getAccessStateText(AuthService.getCurrentProfile()),
      authReady: true,
      isLoading: false,
      loadErrorText: '',
      pageState: products.length ? 'ready' : 'empty',
      emptyText: this.canManageProducts() ? '当前没有商品，可点右下角新增' : '当前账号暂无可管理商品',
      emptyCta: '',
    });
    })();
    try {
      return await (this as any)._fetchInFlight;
    } finally {
      (this as any)._fetchInFlight = null;
    }
  },

  normalizeProducts(products: Product[] = []) {
    return products.map((product) => {
      return {
        ...normalizeProductImageFields(product),
        priceSetting: product.priceSetting || product.priceSettings || [],
      };
    });
  },

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

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/productManagement/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },

  onAddProduct() {
    if (!this.canManageProducts()) {
      wx.showToast({ title: '当前角色不能新增商品', icon: 'none' });
      return;
    }

    navigateByUrl('/sub-pages/product/add/index', {
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
    this.resetDetailState();
    navigateByUrl(`/sub-pages/product/add/index?id=${id}`, {
      fail: () => wx.showToast({ title: '打开商品表单失败', icon: 'none' }),
      events: {
        refreshList: () => {
          this.fetchData();
        }
      }
    });
  },

  onOpenProductList() {
    navigateByUrl('/sub-pages/product/list/index', {
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
    this.resetDetailState();
  },

  stopDetailTap() {},

  onImageError(e: any) {
    const id = String(e.currentTarget.dataset.id);
    const patchCover = product => (String(product.id) === id
      ? { ...product, coverUrl: '', isImageFallback: true, imageFallbackText: '图片加载失败' }
      : product);
    this.setData({
      productList: this.data.productList.map(patchCover),
      allProducts: this.data.allProducts.map(patchCover),
    });
  },

  onDetailImageError() {
    if (!this.data.selectedProduct) return;
    this.setData({
      'selectedProduct.coverUrl': '',
      'selectedProduct.isImageFallback': true,
      'selectedProduct.imageFallbackText': '图片加载失败',
    });
  },

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

  async onStatusChange(e) {
    this.setData({
      currentStatus: e.detail.value
    }, () => this.fetchData());
  },

  onLogin() {
    navigateByUrl(`/pages/login/login?redirectTo=${encodeURIComponent('/pages/productManagement/index')}`, {
      fail: () => wx.showToast({ title: '打开登录页失败', icon: 'none' }),
    });
  },
});
