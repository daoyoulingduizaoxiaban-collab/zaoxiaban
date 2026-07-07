import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { Product } from '~/models/Product';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CLOUD_SAVE_MODE_TEXT, getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import { navigateBackOrTab, navigateByUrl, normalizeRouteUrl } from '~/utils/navigation';
import { normalizeProductImageFields } from '~/utils/productImage';

const PICKER_RESULT_KEY = 'dao_you_ling_product_picker_result';

Page({
  data: {
    pageTitle: '开团',
    isEdit: false,
    groupOrderId: '',
    selectedGoods: [] as Product[],
    isSubmitting: false,
    saveModeText: CLOUD_SAVE_MODE_TEXT,
    accessDenied: false,
    accessStateText: '',
    pageErrorText: '',
    isPageLoading: true,
    sourceUrl: '/pages/groupOrder/index',
    formData: {
      title: '',
      description: '',
      startAt: '',
      endAt: '',
      pickupNote: '',
      paymentNote: '',
      contactName: '',
      contactPhone: '',
      customerNotice: '',
      status: GroupOrderStatus.OPEN,
    }
  },

  async onLoad(options) {
    const sourceUrl = normalizeRouteUrl(options.from || '/pages/groupOrder/index', '/pages/groupOrder/index');
    this.setData({ isPageLoading: true, sourceUrl });
    await AuthService.refreshSession();
    const profile = AuthService.getCurrentProfile();
    const canCreate = canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE);
    if (!canCreate) {
      this.setData({
        accessDenied: true,
        accessStateText: getRoleScopeText(profile, FEATURE_KEYS.GROUP_ORDER_CREATE),
        isPageLoading: false,
      });
      return;
    }
    const groupOrderId = options.id ? String(options.id) : '';
    if (groupOrderId) {
      this.setData({
        pageTitle: '编辑团单',
        isEdit: true,
        groupOrderId
      });
      await this.loadGroupOrder(groupOrderId);
      this.setData({ isPageLoading: false });
      return;
    }
    this.setData({
      pageTitle: '开团',
      isEdit: false,
      groupOrderId: '',
      selectedGoods: [],
      pageErrorText: '',
      formData: {
        title: '',
        description: '',
        startAt: '',
        endAt: '',
        pickupNote: '',
        paymentNote: '',
        contactName: '',
        contactPhone: '',
        customerNotice: '',
        status: GroupOrderStatus.OPEN,
      },
      isPageLoading: false,
    });
  },

  async onShow() {
    this.consumePickerFallbackResult();
  },

  onBack() {
    if (this.data.isSubmitting) return;
    navigateBackOrTab(this.data.sourceUrl || '/pages/groupOrder/index');
  },

  appendSelectedProducts(products = []) {
    const selectedProducts = this.normalizeGoods((products || []).map(item => new Product(item)));
    if (!selectedProducts.length) return;
    const existingIds = new Set(this.data.selectedGoods.map(item => String(item.id)));
    const nextProducts = selectedProducts.filter(item => !existingIds.has(String(item.id)));
    if (!nextProducts.length) return;
    this.setData({
      selectedGoods: [...this.data.selectedGoods, ...nextProducts],
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
    if (!result || !Array.isArray(result.products) || Date.now() - Number(result.createdAt || 0) > 5 * 60 * 1000) return;
    this.appendSelectedProducts(result.products);
  },

  async loadGroupOrder(groupOrderId) {
    const res = await GroupOrderService.getById(groupOrderId);
    if (!res.success) {
      const errorText = res.error || '加载团单失败';
      this.setData({
        pageErrorText: errorText,
        selectedGoods: [],
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }

    this.setData({
      pageErrorText: '',
      formData: {
        title: res.data.title || '',
        description: res.data.description || '',
        startAt: res.data.startAt || '',
        endAt: res.data.endAt || '',
        pickupNote: res.data.pickupNote || '',
        paymentNote: res.data.paymentNote || '',
        contactName: res.data.contactName || '',
        contactPhone: res.data.contactPhone || '',
        customerNotice: res.data.customerNotice || '',
        status: Number(res.data.status || GroupOrderStatus.OPEN),
      },
      selectedGoods: this.normalizeGoods(res.data.productList || []),
    });
  },

  normalizeGoods(goods = []) {
    return goods.map(item => ({
      ...normalizeProductImageFields(item),
      priceSetting: item.priceSetting || item.priceSettings || [],
    }));
  },

  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
  },

  onRemoveGoods(e: any) {
    const { index } = e.currentTarget.dataset;
    const selectedGoods = this.data.selectedGoods.filter((_, itemIndex) => itemIndex !== Number(index));
    this.setData({ selectedGoods });
  },

  onGoodsImageError(e: any) {
    const { index } = e.currentTarget.dataset;
    const selectedGoods = this.data.selectedGoods.map((item, itemIndex) => (
      itemIndex === Number(index)
        ? {
          ...item,
          coverUrl: '',
          isImageFallback: true,
          imageFallbackText: '图片加载失败',
        }
        : item
    ));
    this.setData({ selectedGoods });
  },

  onSelectGoods() {
    if ((this as any)._isOpeningProductPicker) return;
    if (this.data.pageErrorText) {
      wx.showToast({ title: this.data.pageErrorText, icon: 'none' });
      return;
    }
    const existingIds = this.data.selectedGoods.map(item => item.id);
    (this as any)._isOpeningProductPicker = true;
    navigateByUrl(
      `/sub-pages/groupOrder/product-picker/index?excludeIds=${JSON.stringify(existingIds)}&from=${encodeURIComponent('/sub-pages/groupOrder/add/index')}`,
      {
        events: {
          selectedProducts: (data) => {
            this.appendSelectedProducts(data.products || []);
          }
        },
        complete: () => {
          (this as any)._isOpeningProductPicker = false;
        },
        fail: () => {
          wx.showToast({ title: '打开商品库失败', icon: 'none' });
        }
      }
    );
  },

  async onSave() {
    const { formData, selectedGoods, groupOrderId, isEdit } = this.data;

    if (this.data.isSubmitting) return;
    if (this.data.pageErrorText) {
      wx.showToast({ title: this.data.pageErrorText, icon: 'none' });
      return;
    }
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: isEdit ? '保存中...' : '团单建立中...' });

    const payload = {
      ...formData,
      productList: selectedGoods,
    };
    const res = isEdit
      ? await GroupOrderService.update(groupOrderId, payload)
      : await GroupOrderService.create(payload);

    wx.hideLoading();
    this.setData({ isSubmitting: false });

    if (!res.success) {
      wx.showToast({ title: res.error || '保存团单失败', icon: 'none' });
      return;
    }

    const saveModeText = getSaveModeText(res.meta);
    this.setData({ saveModeText });
    wx.showToast({
      title: saveModeText,
      icon: 'none',
      success: () => {
        setTimeout(() => navigateBackOrTab('/pages/groupOrder/index'), 800);
      }
    });
  }
});
