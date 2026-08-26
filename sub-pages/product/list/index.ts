import { ProductService } from '~/services/product/productService';
import { ProductStatus } from '~/enum/ProductStatus';
import { AuthService } from '~/services/auth/authService';
import { normalizeProductImageFields } from '~/utils/productImage';
import { getProductPriceDisplay } from '~/utils/priceDisplay';

Page({
  data: {
    titleText: '商品浏览',
    allProducts: [],
    filteredList: [],
    searchKeyword: '',
    minPrice: null,
    maxPrice: null,
    detailVisible: false,
    selectedProduct: null,
    selectedPriceRules: [],
    pageState: 'loading',
    loadErrorText: '',
    emptyText: '当前没有可浏览商品',
    canUseBusiness: false,
    accessStateText: '',
    pendingProductId: '',
  },

  async onLoad(options = {}) {
    await AuthService.refreshSession();
    const pendingProductId = options.productId || '';
    this.setData({ pendingProductId: pendingProductId ? String(pendingProductId) : '' });
    await this.loadProducts();
  },

  resetDetailState(extraState = {}) {
    this.setData({
      detailVisible: false,
      selectedProduct: null,
      selectedPriceRules: [],
      ...extraState,
    });
  },

  async loadProducts() {
    const profile = AuthService.getCurrentProfile();
    const canUseBusiness = AuthService.canUseBusiness(profile);

    this.setData({ pageState: 'loading', loadErrorText: '' });
    const res = canUseBusiness
      ? await ProductService.listVisible({ status: ProductStatus.PUBLISHED })
      : await ProductService.listPublic({ status: ProductStatus.PUBLISHED });
    if (!res.success) {
      const errorText = res.error || '加载商品失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.resetDetailState({
        pageState: 'error',
        loadErrorText: errorText,
        allProducts: [],
        filteredList: [],
        pendingProductId: '',
      });
      return;
    }
    const products = this.normalizeProducts(res.data);
    this.setData({
      allProducts: products,
      filteredList: products,
      pageState: products.length ? 'ready' : 'empty',
      loadErrorText: '',
      accessStateText: AuthService.getAccessStateText(profile),
      canUseBusiness,
      emptyText: '当前没有可浏览商品',
    });
    this.openPendingProductDetail();
  },

  normalizeProducts(products = []) {
    return products.map((item) => {
      return {
        ...normalizeProductImageFields(item),
        priceSetting: item.priceSetting || item.priceSettings || [],
        priceDisplay: item.priceDisplay || getProductPriceDisplay(item.priceSetting || item.priceSettings || []),
        minUnitPrice: this.getMinUnitPrice(item.priceSetting || item.priceSettings || []),
      };
    });
  },

  getMinUnitPrice(priceSetting = []) {
    const prices = (priceSetting || []).map(rule => Number(rule.unitPrice || 0)).filter(price => price > 0);
    return prices.length ? Math.min(...prices) : 0;
  },


  onInputKeyword(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onMinPriceInput(e) {
    this.setData({ minPrice: e.detail.value });
  },

  onMaxPriceInput(e) {
    this.setData({ maxPrice: e.detail.value });
  },

  onClearSearch() {
    this.setData({
      searchKeyword: '',
      minPrice: null,
      maxPrice: null,
      filteredList: this.data.allProducts,
      pageState: this.data.allProducts.length ? 'ready' : 'empty',
      emptyText: '当前没有可浏览商品',
    });
  },

  executeSearch() {
    const { allProducts, searchKeyword, minPrice, maxPrice } = this.data;

    const query = String(searchKeyword || '').trim().toLowerCase();
    const min = Number(minPrice || 0);
    const max = Number(maxPrice || 0);

    if (min < 0 || max < 0) {
      wx.showToast({ title: '价格区间不能为负数', icon: 'none' });
      return;
    }
    if (min && max && min > max) {
      wx.showToast({ title: '最低价不能高于最高价', icon: 'none' });
      return;
    }

    const results = allProducts.filter(item => {
      const matchKeyword = !query ||
        String(item.title || '').toLowerCase().includes(query) ||
        String(item.description || '').toLowerCase().includes(query) ||
        String(item.sourceNote || '').toLowerCase().includes(query);

      const basePrice = Number(item.minUnitPrice || 0);
      const matchMinPrice = !min || basePrice >= min;
      const matchMaxPrice = !max || basePrice <= max;

      return matchKeyword && matchMinPrice && matchMaxPrice;
    });

    this.setData({
      filteredList: results,
      pageState: results.length ? 'ready' : 'empty',
      emptyText: query || min || max ? '找不到符合条件的商品' : '当前没有可浏览商品',
    });
  },

  openDetail(e) {
    const { id } = e.currentTarget.dataset;
    this.openProductDetailById(id);
  },

  openPendingProductDetail() {
    const id = this.data.pendingProductId;
    if (!id) return;
    this.setData({ pendingProductId: '' });
    this.openProductDetailById(id);
  },

  openProductDetailById(id) {
    const product = this.data.allProducts.find(item => String(item.id) === String(id));
    if (!product) {
      wx.showToast({ title: '未找到商品详情', icon: 'none' });
      return;
    }
    this.setData({
      selectedProduct: {
        ...normalizeProductImageFields(product),
      },
      selectedPriceRules: product.priceSetting || [],
      detailVisible: true,
    });
  },

  closeDetail() {
    this.resetDetailState();
  },

  noop() {},

  onImageError(e) {
    const { id } = e.currentTarget.dataset;
    const nextAll = this.data.allProducts.map(item => (
      String(item.id) === String(id)
        ? { ...item, coverUrl: '', isImageFallback: true, imageFallbackText: '图片加载失败' }
        : item
    ));
    const nextFiltered = this.data.filteredList.map(item => (
      String(item.id) === String(id)
        ? { ...item, coverUrl: '', isImageFallback: true, imageFallbackText: '图片加载失败' }
        : item
    ));
    this.setData({ allProducts: nextAll, filteredList: nextFiltered });
  },

  onDetailImageError() {
    if (!this.data.selectedProduct) return;
    this.setData({
      'selectedProduct.coverUrl': '',
      'selectedProduct.isImageFallback': true,
      'selectedProduct.imageFallbackText': '图片加载失败',
    });
  },
});
