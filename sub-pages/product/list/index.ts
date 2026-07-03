import { ProductService } from '~/services/product/productService';
import { ProductStatus } from '~/enum/ProductStatus';
import { AuthService } from '~/services/auth/authService';

const PRODUCT_IMAGE_FALLBACK = '/static/logo/zaoxiaban.png';

Page({
  data: {
    titleText: '商品列表',
    allProducts: [],
    filteredList: [],
    searchKeyword: '',
    minPrice: null,
    maxPrice: null,
    detailVisible: false,
    selectedProduct: null,
    selectedPriceRules: [],
    isLoading: true,
    pageErrorText: '',
    emptyText: '当前没有可浏览商品',
    canUseBusiness: false,
    accessStateText: '',
  },

  onLoad() {
    this.loadProducts();
  },

  async loadProducts() {
    const profile = AuthService.getCurrentProfile();
    if (!AuthService.canUseBusiness(profile)) {
      this.setData({
        isLoading: false,
        pageErrorText: AuthService.getAccessStateText(profile),
        accessStateText: AuthService.getAccessStateText(profile),
        canUseBusiness: false,
        allProducts: [],
        filteredList: [],
      });
      return;
    }

    this.setData({ isLoading: true, pageErrorText: '' });
    const res = await ProductService.listVisible({ status: ProductStatus.PUBLISHED });
    if (!res.success) {
      const errorText = res.error || '加载商品失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.setData({ isLoading: false, pageErrorText: errorText, allProducts: [], filteredList: [] });
      return;
    }
    const products = this.normalizeProducts(res.data);
    this.setData({
      allProducts: products,
      filteredList: products,
      isLoading: false,
      pageErrorText: '',
      accessStateText: AuthService.getAccessStateText(profile),
      canUseBusiness: true,
      emptyText: products.length ? '' : '当前没有可浏览商品',
    });
  },

  normalizeProducts(products = []) {
    return products.map((item) => {
      const coverUrl = item.coverUrl || (item.pictureUrls && item.pictureUrls[0]) || PRODUCT_IMAGE_FALLBACK;
      return {
        ...item,
        coverUrl,
        isImageFallback: item.isImageFallback || coverUrl === PRODUCT_IMAGE_FALLBACK,
        imageFallbackText: item.imageFallbackText || (coverUrl === PRODUCT_IMAGE_FALLBACK ? '暂无商品图片' : ''),
        priceSetting: item.priceSetting || item.priceSettings || [],
        priceDisplay: item.priceDisplay || this.getPriceDisplay(item.priceSetting || item.priceSettings || []),
        minUnitPrice: this.getMinUnitPrice(item.priceSetting || item.priceSettings || []),
      };
    });
  },

  getMinUnitPrice(priceSetting = []) {
    const prices = (priceSetting || []).map(rule => Number(rule.unitPrice || 0)).filter(price => price > 0);
    return prices.length ? Math.min(...prices) : 0;
  },

  getPriceDisplay(priceSetting = []) {
    const prices = (priceSetting || []).map(rule => Number(rule.unitPrice || 0)).filter(price => price > 0);
    if (!prices.length) return '未设置价格';
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice ? `¥${minPrice}` : `¥${minPrice} ~ ¥${maxPrice}`;
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
      emptyText: this.data.allProducts.length ? '' : '当前没有可浏览商品',
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
      emptyText: query || min || max ? '找不到符合条件的商品' : '当前没有可浏览商品',
    });
  },

  openDetail(e) {
    const { id } = e.currentTarget.dataset;
    const product = this.data.allProducts.find(item => String(item.id) === String(id));
    if (!product) {
      wx.showToast({ title: '未找到商品详情', icon: 'none' });
      return;
    }
    this.setData({
      selectedProduct: {
        ...product,
        coverUrl: product.coverUrl || PRODUCT_IMAGE_FALLBACK,
      },
      selectedPriceRules: product.priceSetting || [],
      detailVisible: true,
    });
  },

  closeDetail() {
    this.setData({
      selectedProduct: null,
      selectedPriceRules: [],
      detailVisible: false,
    });
  },

  noop() {},

  onImageError(e) {
    const { id } = e.currentTarget.dataset;
    const nextAll = this.data.allProducts.map(item => (
      String(item.id) === String(id)
        ? { ...item, coverUrl: PRODUCT_IMAGE_FALLBACK, isImageFallback: true, imageFallbackText: '图片加载失败' }
        : item
    ));
    const nextFiltered = this.data.filteredList.map(item => (
      String(item.id) === String(id)
        ? { ...item, coverUrl: PRODUCT_IMAGE_FALLBACK, isImageFallback: true, imageFallbackText: '图片加载失败' }
        : item
    ));
    this.setData({ allProducts: nextAll, filteredList: nextFiltered });
  },

  onDetailImageError() {
    if (!this.data.selectedProduct) return;
    this.setData({
      'selectedProduct.coverUrl': PRODUCT_IMAGE_FALLBACK,
      'selectedProduct.isImageFallback': true,
      'selectedProduct.imageFallbackText': '图片加载失败',
    });
  },
});
