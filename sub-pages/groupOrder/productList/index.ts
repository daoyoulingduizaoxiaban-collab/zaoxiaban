import { Product } from "~/models/Product";
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';

Page({
  data: {
    groupOrderId: '',
    searchQuery: '',
    rawList: [] as Product[],
    displayList: [] as Product[],
    detailVisible: false,
    selectedProduct: null,
    selectedPriceRules: [],
    skipNextReload: false,
    pageErrorText: '',
    isLoading: true,
  },

  onLoad(options) {
    const groupOrderId = options.id ? String(options.id) : '';
    this.setData({
      groupOrderId,
      pageErrorText: groupOrderId ? '' : '缺少团单 ID，请返回团单详情重新进入。',
      isLoading: Boolean(groupOrderId),
    });
  },

  onShow() {
    if (this.data.skipNextReload) {
      this.setData({
        skipNextReload: false
      });
      return;
    }

    this.loadGroupProducts();
  },

  async loadGroupProducts() {
    const { groupOrderId } = this.data;
    if (!groupOrderId) {
      this.setData({
        isLoading: false,
        pageErrorText: '缺少团单 ID，请返回团单详情重新进入。',
        rawList: [],
        displayList: [],
      });
      return;
    }

    const res = await GroupOrderService.getById(groupOrderId);
    if (!res.success) {
      const errorText = res.error || '加载本团商品失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.setData({ rawList: [], displayList: [], isLoading: false, pageErrorText: errorText });
      return;
    }
    const groupProducts = this.normalizeProducts(res.data.productList || []);

    this.setData({
      rawList: groupProducts,
      isLoading: false,
      pageErrorText: '',
      displayList: this.filterList(groupProducts, this.data.searchQuery)
    });
  },

  normalizeProducts(products) {
    return products.map(item => {
      const priceSetting = item.priceSetting || [];
      const prices = priceSetting.map(setting => setting.unitPrice);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        ...item,
        priceDisplay: prices.length === 0
          ? ''
          : minPrice === maxPrice
            ? `￥${minPrice}`
            : `￥${minPrice} ~ ￥${maxPrice}`,
        coverUrl: item.pictureUrls && item.pictureUrls[0] ? item.pictureUrls[0] : '/static/icon_map.png',
      };
    });
  },

  onSearchInput(e) {
    const query = e.detail.value;
    this.setData({
      searchQuery: query,
      displayList: this.filterList(this.data.rawList, query)
    });
  },

  clearSearch() {
    this.setData({
      searchQuery: '',
      displayList: this.data.rawList
    });
  },

  filterList(list, query) {
    if (!query) return list;
    const keyword = query.toLowerCase();
    return list.filter(item =>
      String(item.title || '').toLowerCase().includes(keyword) ||
      String(item.description || '').toLowerCase().includes(keyword)
    );
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    const product = this.data.rawList.find(item => String(item.id) === String(id));
    if (!product) {
      wx.showToast({ title: '未找到商品详情', icon: 'none' });
      return;
    }

    const selectedPriceRules = (product.priceSetting || []).map(rule => ({
      minQuantity: rule.minQuantity,
      unitPrice: rule.unitPrice,
      description: rule.description || '',
    }));

    this.setData({
      selectedProduct: {
        ...product,
        statusText: Number(product.status) === 2 ? '已上架' : '已下架',
        coverUrl: product.coverUrl || '/static/icon_map.png',
      },
      selectedPriceRules,
      detailVisible: true,
    });
  },

  closeProductDetail() {
    this.setData({
      detailVisible: false,
      selectedProduct: null,
      selectedPriceRules: [],
    });
  },

  noop() {},

  onImageError(e) {
    const { id } = e.currentTarget.dataset;
    const patchCover = item => (String(item.id) === String(id) ? { ...item, coverUrl: '/static/icon_map.png' } : item);
    this.setData({
      rawList: this.data.rawList.map(patchCover),
      displayList: this.data.displayList.map(patchCover),
    });
  },

  onDetailImageError() {
    if (!this.data.selectedProduct) return;
    this.setData({
      'selectedProduct.coverUrl': '/static/icon_map.png',
    });
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '移除商品',
      content: '确定要从本团移除此商品吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          const removeRes = await GroupOrderService.removeProduct(this.data.groupOrderId, id);
          if (!removeRes.success) {
            wx.showToast({ title: removeRes.error || '移除商品失败', icon: 'none' });
            return;
          }
          const rawList = this.data.rawList.filter(item => item.id !== id);

          this.setData({
            rawList,
            displayList: this.filterList(rawList, this.data.searchQuery)
          });

          wx.showToast({ title: getSaveModeText(removeRes.meta), icon: 'none' });
        }
      }
    });
  },

  goToLibrary() {
    if (!this.data.groupOrderId) {
      this.setData({ pageErrorText: '缺少团单 ID，请返回团单详情重新进入。' });
      return;
    }

    const existingIds = this.data.rawList.map(item => item.id);

    this.setData({
      skipNextReload: true
    });

    wx.navigateTo({
      url: `/sub-pages/groupOrder/product-picker/index?excludeIds=${JSON.stringify(existingIds)}`,
      events: {
        selectedProducts: (data) => {
          const selectedProducts = this.normalizeProducts((data.products || []).map(item => new Product(item)));
          if (selectedProducts.length === 0) return;

          GroupOrderService.addProducts(this.data.groupOrderId, selectedProducts).then((res) => {
            if (!res.success) {
              wx.showToast({ title: res.error || '加入商品失败', icon: 'none' });
              return;
            }
            const rawList = this.normalizeProducts(res.data.productList || []);
            this.setData({
              rawList,
              displayList: this.filterList(rawList, this.data.searchQuery)
            });
            wx.showToast({ title: getSaveModeText(res.meta), icon: 'none' });
          });
        }
      },
      fail: () => {
        this.setData({
          skipNextReload: false
        });
        wx.showToast({
          title: '打开商品库失败',
          icon: 'none'
        });
      }
    });
  }
});
