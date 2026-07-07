import { ProductService } from '~/services/product/productService';
import { AuthService } from '~/services/auth/authService';
import { navigateBackOrTab, navigateByUrl } from '~/utils/navigation';
import { normalizeProductImageFields } from '~/utils/productImage';

const PICKER_RESULT_KEY = 'dao_you_ling_product_picker_result';

Page({
  data: {
    excludeIds: [],
    allProducts: [],
    products: [],
    searchQuery: '',
    selectedCount: 0,
    pageErrorText: '',
    isLoading: true,
    hasEventChannel: false,
    sourceUrl: '/sub-pages/groupOrder/add/index',
    searchFocus: false,
    searchActive: false,
  },

  getSafeEventChannel() {
    try {
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (eventChannel && typeof eventChannel.emit === 'function') {
        return eventChannel;
      }
    } catch {
      return null;
    }
    return null;
  },

  onLoad(options) {
    const hasEventChannel = Boolean(this.getSafeEventChannel());
    const sourceUrl = options.from ? decodeURIComponent(String(options.from)) : '/sub-pages/groupOrder/add/index';
    this.setData({
      hasEventChannel,
      sourceUrl,
      pageErrorText: '',
      isLoading: true,
      searchFocus: false,
    });

    if (options.excludeIds) {
      try {
        const ids = JSON.parse(options.excludeIds).map(id => String(id));
        this.setData({ excludeIds: ids });
      } catch (e) {
        wx.showToast({
          title: '商品参数错误',
          icon: 'none'
        });
      }
    }

    this.loadProductLibrary();
  },

  async loadProductLibrary() {
    if ((this as any)._loadProductsInFlight) return (this as any)._loadProductsInFlight;
    if ((this as any)._hasLoadedProductLibrary) return;
    (this as any)._hasLoadedProductLibrary = true;
    (this as any)._loadProductsInFlight = (async () => {
    await AuthService.refreshSession();
    const res = await ProductService.listVisible();
    if (!res.success) {
      const errorText = res.error || '加载商品库失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.setData({ pageErrorText: errorText, isLoading: false, allProducts: [], products: [] });
      return;
    }
    const processedList = res.data.map(item => {
      const productId = item.id || item._id;
      const isExist = this.data.excludeIds.includes(String(productId));
      return {
        ...normalizeProductImageFields(item),
        id: productId,
        priceDisplay: item.priceDisplay || this.getPriceDisplay(item.priceSetting || item.priceSettings || []),
        disabled: isExist,
        selected: false
      };
    });

    this.setData({
      allProducts: processedList,
      products: processedList,
      isLoading: false,
      selectedCount: processedList.filter(item => item.selected).length,
      searchFocus: false,
      searchActive: false,
    });
    })();
    try {
      return await (this as any)._loadProductsInFlight;
    } finally {
      (this as any)._loadProductsInFlight = null;
    }
  },

  onSearchInput(e) {
    const keyword = String(e.detail && e.detail.value !== undefined ? e.detail.value : e.detail || '');
    this.applySearchKeyword(keyword);
  },

  focusSearch() {
    if (this.data.searchFocus && this.data.searchActive) return;
    this.setData({
      searchFocus: true,
      searchActive: true,
    });
  },

  applySearchKeyword(keyword) {
    this.setData({
      searchQuery: keyword,
      products: this.filterProducts(this.data.allProducts, keyword)
    });
  },

  onSearchFocus() {
    if (this.data.searchActive) return;
    this.setData({ searchActive: true });
  },

  onSearchBlur() {
    const searchActive = Boolean(this.data.searchQuery);
    if (!this.data.searchFocus && this.data.searchActive === searchActive) return;
    this.setData({ searchFocus: false, searchActive });
  },

  clearSearch() {
    this.setData({
      searchQuery: '',
      products: this.data.allProducts,
      searchFocus: true,
      searchActive: true,
    });
  },

  filterProducts(products, keyword) {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    if (!normalizedKeyword) {
      return products;
    }

    return products.filter(product => {
      const title = String(product.title || '');
      const searchableText = [
        title,
        product.description,
        product.sourceNote,
        product.searchAlias,
        title.includes('龙井') ? 'long longjing lng 龙井' : '',
      ].join(' ').toLowerCase();

      return searchableText.includes(normalizedKeyword);
    });
  },

  getPriceDisplay(priceSetting = []) {
    const prices = (priceSetting || []).map(rule => Number(rule.unitPrice || 0)).filter(price => price > 0);
    if (!prices.length) return '未设置价格';
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice ? `¥${minPrice}` : `¥${minPrice} ~ ¥${maxPrice}`;
  },

  syncProducts() {
    this.setData({
      products: this.filterProducts(this.data.allProducts, this.data.searchQuery)
    });
  },

  setProductSelected(id, selected) {
    const normalizedId = String(id);
    const allProducts = this.data.allProducts.map(product => {
      if (String(product.id) !== normalizedId) {
        return product;
      }

      return {
        ...product,
        selected
      };
    });

    const products = this.filterProducts(allProducts, this.data.searchQuery);
    this.setData({
      allProducts,
      products,
      selectedCount: allProducts.filter(product => product.selected).length,
    });
  },

  toggleSelect(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.allProducts.find(product => String(product.id) === String(id));

    if (!item || item.disabled || this.data.pageErrorText) {
      return;
    }

    this.setProductSelected(id, !item.selected);
  },

  onImageError(e) {
    const { id } = e.currentTarget.dataset;
    const patchCover = product => (String(product.id) === String(id) ? {
      ...product,
      coverUrl: '',
      isImageFallback: true,
      imageFallbackText: '图片加载失败',
    } : product);
    this.setData({
      allProducts: this.data.allProducts.map(patchCover),
      products: this.data.products.map(patchCover)
    });
  },

  calculateCount() {
    const count = this.data.allProducts.filter(p => p.selected).length;
    this.setData({ selectedCount: count });
  },

  saveFallbackResult(products) {
    if ((this as any)._fallbackResultSaved) return true;
    try {
      wx.setStorageSync(PICKER_RESULT_KEY, {
        products,
        createdAt: Date.now(),
      });
      (this as any)._fallbackResultSaved = true;
      return true;
    } catch (err) {
      return false;
    }
  },

  returnToSource() {
    if ((this as any)._isReturning) return;
    (this as any)._isReturning = true;
    navigateBackOrTab(this.data.sourceUrl || '/sub-pages/groupOrder/add/index');
  },

  onBack() {
    this.returnToSource();
  },

  goProductLibrary() {
    navigateByUrl('/pages/productManagement/index', {
      fail: () => wx.showToast({ title: '打开商品库失败', icon: 'none' }),
    });
  },

  confirmAdd() {
    if ((this as any)._isReturning) return;
    if (this.data.selectedCount <= 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    const selectedItems = this.data.allProducts.filter(p => p.selected);

    wx.showLoading({ title: '加入中...' });

    wx.hideLoading();

    const products = selectedItems.map(item => ({
      ...item,
      selected: false,
      disabled: false
    }));
    const eventChannel = this.getSafeEventChannel();
    if (!eventChannel) {
      const fallbackSaved = this.saveFallbackResult(products);
      wx.showToast({ title: fallbackSaved ? '已返回选择结果' : '返回商品选择结果失败', icon: 'none' });
      if (fallbackSaved) this.returnToSource();
      return;
    }

    try {
      eventChannel.emit('selectedProducts', { products });
      this.returnToSource();
    } catch (err) {
      const fallbackSaved = this.saveFallbackResult(products);
      wx.showToast({ title: fallbackSaved ? '已返回选择结果' : '返回商品选择结果失败', icon: 'none' });
      if (fallbackSaved) this.returnToSource();
    }
  }
});
