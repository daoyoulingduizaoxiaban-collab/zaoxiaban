import { Product } from "~/models/Product";
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, isOwnerOrAdmin } from '~/services/auth/roleScope';
import { navigateByUrl } from '~/utils/navigation';
import { normalizeProductImageFields } from '~/utils/productImage';

const PICKER_RESULT_KEY = 'dao_you_ling_product_picker_result';

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
    canManageGroupOrder: false,
    pendingProductId: '',
  },

  async onLoad(options) {
    await AuthService.refreshSession();
    const groupOrderId = options.id || options.groupOrderId ? String(options.id || options.groupOrderId) : '';
    const pendingProductId = options.productId ? String(options.productId) : '';
    this.setData({
      groupOrderId,
      pendingProductId,
      pageErrorText: groupOrderId ? '' : '缺少团单 ID，请返回团单详情重新进入。',
      isLoading: Boolean(groupOrderId),
    });
  },

  async onShow() {
    await AuthService.refreshSession();
    if (this.consumePickerFallbackResult()) {
      return;
    }
    if (this.data.skipNextReload) {
      this.setData({
        skipNextReload: false
      });
      return;
    }

    await this.loadGroupProducts();
  },

  resetDetailState(extraState = {}) {
    this.setData({
      detailVisible: false,
      selectedProduct: null,
      selectedPriceRules: [],
      ...extraState,
    });
  },

  consumePickerFallbackResult() {
    let result = null;
    try {
      result = wx.getStorageSync(PICKER_RESULT_KEY);
      wx.removeStorageSync(PICKER_RESULT_KEY);
    } catch (err) {
      result = null;
    }
    if (!result || !Array.isArray(result.products) || Date.now() - Number(result.createdAt || 0) > 5 * 60 * 1000) return false;
    if (!this.data.groupOrderId || !this.data.canManageGroupOrder) return false;
    const selectedProducts = this.normalizeProducts((result.products || []).map(item => new Product(item)));
    if (!selectedProducts.length) return false;
    const existingIds = new Set(this.data.rawList.map(item => String(item.id)));
    const nextProducts = selectedProducts.filter(item => !existingIds.has(String(item.id)));
    if (!nextProducts.length) return true;
    GroupOrderService.addProducts(this.data.groupOrderId, nextProducts).then((res) => {
      if (!res.success) {
        wx.showToast({ title: res.error || '加入商品失败', icon: 'none' });
        return;
      }
      const rawList = this.normalizeProducts(res.data.productList || []);
      this.setData({
        rawList,
        displayList: this.filterList(rawList, this.data.searchQuery),
        skipNextReload: false,
      });
      wx.showToast({ title: getSaveModeText(res.meta), icon: 'none' });
    });
    return true;
  },

  async loadGroupProducts() {
    const { groupOrderId } = this.data;
    if (!groupOrderId) {
      this.resetDetailState({
        isLoading: false,
        pageErrorText: '缺少团单 ID，请返回团单详情重新进入。',
        rawList: [],
        displayList: [],
        pendingProductId: '',
      });
      return;
    }

    const res = await GroupOrderService.getById(groupOrderId);
    if (!res.success) {
      const errorText = res.error || '加载本团商品失败';
      wx.showToast({ title: errorText, icon: 'none' });
      this.resetDetailState({
        rawList: [],
        displayList: [],
        isLoading: false,
        pageErrorText: errorText,
        canManageGroupOrder: false,
        pendingProductId: '',
      });
      return;
    }
    const canManageGroupOrder = this.canManageGroupOrder(res.data);
    const groupProducts = this.normalizeProducts(res.data.productList || []);

    this.setData({
      rawList: groupProducts,
      isLoading: false,
      pageErrorText: '',
      canManageGroupOrder,
      displayList: this.filterList(groupProducts, this.data.searchQuery)
    });
    this.openPendingProductDetail();
  },

  normalizeProducts(products) {
    return products.map(item => {
      const priceSetting = item.priceSetting || [];
      const prices = priceSetting.map(setting => setting.unitPrice);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        ...normalizeProductImageFields(item),
        priceDisplay: prices.length === 0
          ? '未设置价格'
          : minPrice === maxPrice
            ? `￥${minPrice}`
            : `￥${minPrice} ~ ￥${maxPrice}`,
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
    this.openProductDetailById(id);
  },

  openPendingProductDetail() {
    const id = this.data.pendingProductId;
    if (!id || this.data.pageErrorText) return;
    this.setData({ pendingProductId: '' });
    this.openProductDetailById(id);
  },

  openProductDetailById(id) {
    const product = this.data.rawList.find(item => String(item.id) === String(id));
    if (!product) {
      wx.showToast({ title: '未找到商品详情', icon: 'none' });
      this.setData({ pendingProductId: '' });
      return;
    }

    const selectedPriceRules = (product.priceSetting || []).map(rule => ({
      minQuantity: rule.minQuantity,
      unitPrice: rule.unitPrice,
      description: rule.description || '',
    }));

    this.setData({
      selectedProduct: {
        ...normalizeProductImageFields(product),
        statusText: Number(product.status) === 2 ? '已上架' : '已下架',
      },
      selectedPriceRules,
      detailVisible: true,
    });
  },

  closeProductDetail() {
    this.resetDetailState();
  },

  noop() {},

  onImageError(e) {
    const { id } = e.currentTarget.dataset;
    const patchCover = item => (String(item.id) === String(id)
      ? { ...item, coverUrl: '', isImageFallback: true, imageFallbackText: '图片加载失败' }
      : item);
    this.setData({
      rawList: this.data.rawList.map(patchCover),
      displayList: this.data.displayList.map(patchCover),
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

  onDelete(e) {
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能移除本团商品', icon: 'none' });
      return;
    }
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
    if (!this.data.canManageGroupOrder) {
      wx.showToast({ title: '当前账号不能管理本团商品', icon: 'none' });
      return;
    }
    if (!this.data.groupOrderId) {
      this.resetDetailState({
        pageErrorText: '缺少团单 ID，请返回团单详情重新进入。',
        pendingProductId: '',
      });
      return;
    }

    const existingIds = this.data.rawList.map(item => item.id);

    this.setData({
      skipNextReload: true
    });

    navigateByUrl(
      `/sub-pages/groupOrder/product-picker/index?excludeIds=${JSON.stringify(existingIds)}`,
      {
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
      }
    );
  },

  canManageGroupOrder(groupOrder) {
    const profile = AuthService.getCurrentProfile();
    if (!canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE)) return false;
    if (isOwnerOrAdmin(profile)) return true;
    if (!profile || profile.role !== 'guide' || !groupOrder) return false;

    const sameId = (a, b) => String(a) === String(b);
    const authorizedGuideIds = groupOrder.authorizedGuideIds || [];
    const authorizedGuideOpenIds = groupOrder.authorizedGuideOpenIds || [];
    return sameId(groupOrder.guideUserId, profile.id)
      || sameId(groupOrder.guideOpenId, profile.openId)
      || authorizedGuideIds.some(id => sameId(id, profile.id))
      || authorizedGuideOpenIds.some(openId => sameId(openId, profile.openId));
  }
});
