import { GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { Product } from '~/models/Product';
import { GroupOrderService } from '~/services/groupOrder/groupOrderService';
import { CLOUD_SAVE_MODE_TEXT, getSaveModeText } from '~/repositories/cloudBusinessRepository';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature } from '~/services/auth/roleScope';

const PRODUCT_IMAGE_FALLBACK = '/static/logo/zaoxiaban.png';

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

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const canCreate = canUseFeature(profile, FEATURE_KEYS.GROUP_ORDER_CREATE);
    if (!canCreate) {
      this.setData({
        accessDenied: true,
        accessStateText: AuthService.getAccessStateText(profile),
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
      this.loadGroupOrder(groupOrderId);
    }
  },

  async loadGroupOrder(groupOrderId) {
    const res = await GroupOrderService.getById(groupOrderId);
    if (!res.success) {
      wx.showToast({ title: res.error || '加载团单失败', icon: 'none' });
      return;
    }

    this.setData({
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
      ...item,
      coverUrl: item.coverUrl || (item.pictureUrls && item.pictureUrls[0]) || PRODUCT_IMAGE_FALLBACK,
      isImageFallback: item.isImageFallback || !(item.coverUrl || (item.pictureUrls && item.pictureUrls[0])),
      imageFallbackText: item.imageFallbackText || (!(item.coverUrl || (item.pictureUrls && item.pictureUrls[0])) ? '暂无商品图片' : ''),
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
          coverUrl: PRODUCT_IMAGE_FALLBACK,
          isImageFallback: true,
          imageFallbackText: '图片加载失败',
        }
        : item
    ));
    this.setData({ selectedGoods });
  },

  onSelectGoods() {
    const existingIds = this.data.selectedGoods.map(item => item.id);
    wx.navigateTo({
      url: `/sub-pages/groupOrder/product-picker/index?excludeIds=${JSON.stringify(existingIds)}`,
      events: {
        selectedProducts: (data) => {
          const selectedProducts = this.normalizeGoods((data.products || []).map(item => new Product(item)));
          if (selectedProducts.length === 0) return;
          this.setData({
            selectedGoods: [...this.data.selectedGoods, ...selectedProducts]
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '打开商品库失败', icon: 'none' });
      }
    });
  },

  async onSave() {
    const { formData, selectedGoods, groupOrderId, isEdit } = this.data;

    if (this.data.isSubmitting) return;
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
        setTimeout(() => wx.navigateBack(), 800);
      }
    });
  }
});
