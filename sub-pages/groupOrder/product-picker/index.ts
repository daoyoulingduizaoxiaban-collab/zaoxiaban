import { ProductMock } from '~/mock/product/index';

Page({
  data: {
    excludeIds: [], // 已經存在於團購中的商品ID
    allProducts: [], // 原始資料
    products: [],    // 顯示資料 (含 selected/disabled 狀態)
    searchQuery: '',
    selectedCount: 0
  },

  onLoad(options) {
    // 1. 接收參數：要排除的 ID 列表
    if (options.excludeIds) {
      try {
        const ids = JSON.parse(options.excludeIds);
        this.setData({ excludeIds: ids });
      } catch (e) {
        wx.showToast({
          title: '商品參數錯誤',
          icon: 'none'
        });
      }
    }

    // 2. 載入商品庫
    this.loadProductLibrary();
  },

  async loadProductLibrary() {
    const res = await ProductMock.fetchProductListMock();
    const processedList = res.data.map(item => {
      const isExist = this.data.excludeIds.includes(item.id);
      return {
        ...item,
        disabled: isExist,
        selected: false
      };
    });

    this.setData({
      allProducts: processedList,
      products: processedList
    });
  },

  // 搜尋功能
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
      product.title.toLowerCase().includes(normalizedKeyword) ||
      product.description.toLowerCase().includes(normalizedKeyword)
    );
  },

  syncProducts() {
    this.setData({
      products: this.filterProducts(this.data.allProducts, this.data.searchQuery)
    });
  },

  setProductSelected(id, selected) {
    const allProducts = this.data.allProducts.map(product => {
      if (product.id !== id) {
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

  // 切換選中狀態
  toggleSelect(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.allProducts.find(product => product.id === id);

    // 防呆
    if (!item || item.disabled) {
      return;
    }

    this.setProductSelected(id, !item.selected);
  },

  calculateCount() {
    const count = this.data.allProducts.filter(p => p.selected).length;
    this.setData({ selectedCount: count });
  },

  // 確認加入
  confirmAdd() {
    const selectedItems = this.data.allProducts.filter(p => p.selected);

    if (selectedItems.length === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加入中...' });

    setTimeout(() => {
      wx.hideLoading();

      const eventChannel = this.getOpenerEventChannel();
      eventChannel.emit('selectedProducts', {
        products: selectedItems.map(item => ({
          ...item,
          selected: false,
          disabled: false
        }))
      });

      wx.navigateBack();
    }, 500);
  }
});
