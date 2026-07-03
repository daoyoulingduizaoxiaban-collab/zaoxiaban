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
  },

  onLoad() {
    this.loadProducts();
  },

  async loadProducts() {
    const res = await ProductService.listVisible();
    if (!res.success) {
      wx.showToast({ title: res.error || '加载商品失败', icon: 'none' });
      return;
    }
    this.setData({
      allProducts: this.normalizeProducts(res.data),
      filteredList: this.normalizeProducts(res.data)
    });
  },

  normalizeProducts(products = []) {
    return products.map(item => ({
      ...item,
      coverUrl: item.pictureUrls && item.pictureUrls[0] ? item.pictureUrls[0] : '/static/icon_map.png',
      priceSetting: item.priceSetting || item.priceSettings || [],
    }));
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

    const results = allProducts.filter(item => {
      const matchKeyword = !searchKeyword ||
        item.title.includes(searchKeyword) ||
        item.description.includes(searchKeyword);

      const basePrice = item.priceSetting[0] ? item.priceSetting[0].unitPrice : 0;
      const matchMinPrice = !minPrice || basePrice >= parseFloat(minPrice);
      const matchMaxPrice = !maxPrice || basePrice <= parseFloat(maxPrice);

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
      selectedProduct: product,
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
});
