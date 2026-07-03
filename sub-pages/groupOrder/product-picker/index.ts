import { ProductService } from '~/services/product/productService';
import { navigateBackOrTab } from '~/utils/navigation';

const PRODUCT_IMAGE_FALLBACK = '/static/logo/zaoxiaban.png';

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
    this.setData({
      hasEventChannel,
      pageErrorText: hasEventChannel ? '' : '请从本团商品页进入，才能把商品加入团单。',
      isLoading: hasEventChannel,
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
      const isExist = this.data.excludeIds.includes(String(item.id));
      return {
        ...item,
        coverUrl: item.coverUrl || (item.pictureUrls && item.pictureUrls[0]) || PRODUCT_IMAGE_FALLBACK,
        isImageFallback: item.isImageFallback || !(item.coverUrl || (item.pictureUrls && item.pictureUrls[0])),
        imageFallbackText: item.imageFallbackText || (!(item.coverUrl || (item.pictureUrls && item.pictureUrls[0])) ? '暂无商品图片' : ''),
        priceDisplay: item.priceDisplay || this.getPriceDisplay(item.priceSetting || item.priceSettings || []),
        disabled: isExist,
        selected: false
      };
    });

    this.setData({
      allProducts: processedList,
      products: processedList,
      isLoading: false,
    });
  },

  onSearch(e) {
    const keyword = e.detail.value;
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
      coverUrl: PRODUCT_IMAGE_FALLBACK,
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

  confirmAdd() {
    const selectedItems = this.data.allProducts.filter(p => p.selected);

    if (!this.data.hasEventChannel) {
      wx.showToast({ title: '请从本团商品页进入', icon: 'none' });
      return;
    }

    if (selectedItems.length === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
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
        wx.showToast({
          title: '返回商品选择结果失败',
          icon: 'none'
        });
        return;
      }

      navigateBackOrTab('/pages/groupOrder/index');
    }, 500);
  }
});
