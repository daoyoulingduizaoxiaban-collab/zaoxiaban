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
    searchFocus: false,
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

  async onLoad(options) {
    const hasEventChannel = Boolean(this.getSafeEventChannel());
    this.setData({
      hasEventChannel,
      pageErrorText: hasEventChannel ? '' : '请从本团商品页进入，才能把商品加入团单。',
      isLoading: hasEventChannel,
      searchFocus: hasEventChannel,
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

    if (!hasEventChannel) {
      this.setData({ allProducts: [], products: [], isLoading: false });
      return;
    }

    await AuthService.refreshSession();
    this.loadProductLibrary();
  },

  async loadProductLibrary() {
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
      searchFocus: true,
    });
  },

  onSearch(e) {
    const keyword = String(e.detail && e.detail.value !== undefined ? e.detail.value : e.detail || '');
    this.setData({
      searchQuery: keyword,
      products: this.filterProducts(this.data.allProducts, keyword)
    });
  },

  filterProducts(products, keyword) {
    if (!keyword) {
      return products;
    }

    const normalizedKeyword = keyword.toLowerCase();
    return products.filter(product =>
      String(product.title || '').toLowerCase().includes(normalizedKeyword) ||
      String(product.description || '').toLowerCase().includes(normalizedKeyword) ||
      String(product.sourceNote || '').toLowerCase().includes(normalizedKeyword)
    );
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

    this.setData({
      allProducts
    }, () => {
      this.syncProducts();
      this.calculateCount();
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
    try {
      wx.setStorageSync(PICKER_RESULT_KEY, {
        products,
        createdAt: Date.now(),
      });
      return true;
    } catch (err) {
      return false;
    }
  },

  goProductLibrary() {
    navigateByUrl('/pages/productManagement/index', {
      fail: () => wx.showToast({ title: '打开商品库失败', icon: 'none' }),
    });
  },

  confirmAdd() {
    if (this.data.selectedCount <= 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    const selectedItems = this.data.allProducts.filter(p => p.selected);

    if (!this.data.hasEventChannel) {
      wx.showToast({ title: '请从本团商品页进入', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加入中...' });

    setTimeout(() => {
      wx.hideLoading();

      const eventChannel = this.getSafeEventChannel();
      if (!eventChannel) {
        wx.showToast({
          title: '请从本团商品页进入',
          icon: 'none'
        });
        return;
      }

      try {
        eventChannel.emit('selectedProducts', {
          products: selectedItems.map(item => ({
            ...item,
            selected: false,
            disabled: false
          }))
        });
      } catch (err) {
        const fallbackSaved = this.saveFallbackResult(selectedItems.map(item => ({
          ...item,
          selected: false,
          disabled: false
        })));
        wx.showToast({ title: fallbackSaved ? '已返回选择结果' : '返回商品选择结果失败', icon: 'none' });
        if (fallbackSaved) {
          navigateBackOrTab('/pages/groupOrder/index');
        }
        return;
      }

      navigateBackOrTab('/pages/groupOrder/index');
    }, 500);
  }
});
