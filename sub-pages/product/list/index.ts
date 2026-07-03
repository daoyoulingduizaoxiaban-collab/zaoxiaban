import { ProductService } from '~/services/product/productService';

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
  },

  onLoad() {
    this.loadProducts();
  },

  async loadProducts() {
    const res = await ProductService.listVisible();
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
    });
  },

  normalizeProducts(products = []) {
    return products.map(item => ({
      ...item,
      coverUrl: item.pictureUrls && item.pictureUrls[0] ? item.pictureUrls[0] : '/static/icon_map.png',
      priceSetting: item.priceSetting || item.priceSettings || [],
      priceDisplay: item.priceDisplay || this.getPriceDisplay(item.priceSetting || item.priceSettings || []),
      minUnitPrice: this.getMinUnitPrice(item.priceSetting || item.priceSettings || []),
    }));
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
    this.setData({ searchKeyword: '', filteredList: this.data.allProducts });
  },

  executeSearch() {
    const { allProducts, searchKeyword, minPrice, maxPrice } = this.data;

    const query = String(searchKeyword || '').trim().toLowerCase();
    const min = Number(minPrice || 0);
    const max = Number(maxPrice || 0);

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

    this.setData({ filteredList: results });
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
        coverUrl: product.coverUrl || '/static/icon_map.png',
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
      String(item.id) === String(id) ? { ...item, coverUrl: '/static/icon_map.png' } : item
    ));
    const nextFiltered = this.data.filteredList.map(item => (
      String(item.id) === String(id) ? { ...item, coverUrl: '/static/icon_map.png' } : item
    ));
    this.setData({ allProducts: nextAll, filteredList: nextFiltered });
  },

  onDetailImageError() {
    if (!this.data.selectedProduct) return;
    this.setData({
      'selectedProduct.coverUrl': '/static/icon_map.png',
    });
  },
});
