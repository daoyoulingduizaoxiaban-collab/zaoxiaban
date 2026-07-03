import { ProductStatus } from '~/enum/ProductStatus';
import { ProductService } from '~/services/product/productService';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import {
  CLOUD_SAVE_MODE,
  CLOUD_SAVE_MODE_TEXT,
  getSaveModeText,
  isCloudBusinessEnabled,
} from '~/repositories/cloudBusinessRepository';
import { navigateBackOrTab } from '~/utils/navigation';

Page({
  data: {
    pageTitle: '新增商品',
    isEdit: false,
    isSubmitting: false,
    isChoosingImage: false,
    accessDenied: false,
    accessStateText: '',
    pageErrorText: '',
    saveModeText: CLOUD_SAVE_MODE_TEXT,
    imageModeTip: '图片会随商品资料一起保存，便于客户查看实物。',

    currentProduct: {
      id: 0,
      title: '',
      description: '',
      pictureUrls: [],
      priceSetting: [],
      providerId: '',
      status: ProductStatus.PUBLISHED,
      sourceNote: ''
    },

    tempPriceSetting: {
      minQuantity: 1,
      unitPrice: '',
      description: ''
    }
  },

  onLoad(options) {
    const profile = AuthService.getCurrentProfile();
    const canCreate = canUseFeature(profile, FEATURE_KEYS.PRODUCT_MANAGE);
    if (!canCreate) {
      this.setData({
        accessDenied: true,
        accessStateText: getRoleScopeText(profile, FEATURE_KEYS.PRODUCT_MANAGE),
      });
      return;
    }
    const productId = options && options.id ? String(options.id) : '';
    if (productId) {
      this.setData({ pageTitle: '编辑商品', isEdit: true });
      this.loadProduct(productId);
    }
    this.refreshSaveModeText();
  },

  onShow() {
    this.refreshSaveModeText();
  },

  refreshSaveModeText() {
    const cloudEnabled = isCloudBusinessEnabled();
    this.setData({
      saveModeText: getSaveModeText({
        saveMode: cloudEnabled ? CLOUD_SAVE_MODE : 'local-product-repository',
      }),
      imageModeTip: cloudEnabled
        ? '图片会随商品资料一起保存，便于客户查看实物。'
        : '图片保存服务不可用，请稍后重试或联系管理员。',
    });
  },

  async loadProduct(productId) {
    const res = await ProductService.getById(productId);
    if (!res.success) {
      const errorText = res.error || '加载商品失败';
      this.setData({
        pageErrorText: errorText,
        saveModeText: errorText,
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }

    this.setData({
      pageErrorText: '',
      currentProduct: {
        ...this.data.currentProduct,
        ...res.data,
        id: res.data.id || res.data._id || productId,
        pictureUrls: res.data.pictureUrls || [],
        priceSetting: res.data.priceSetting || res.data.priceSettings || [],
      },
      saveModeText: getSaveModeText(res.meta),
    });
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

  onProductInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`currentProduct.${field}`]: e.detail.value
    });
  },

  onPriceInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`tempPriceSetting.${field}`]: e.detail.value
    });
  },

  addPriceRule() {
    const { minQuantity, unitPrice, description } = this.data.tempPriceSetting;
    const normalizedMinQuantity = Number(minQuantity);
    const normalizedUnitPrice = Number(unitPrice);

    if (!normalizedMinQuantity || normalizedMinQuantity < 1) {
      return wx.showToast({ title: '起订量需大于 0', icon: 'none' });
    }
    if (!normalizedUnitPrice || normalizedUnitPrice <= 0) {
      return wx.showToast({ title: '请输入有效单价', icon: 'none' });
    }

    const newRule = {
      minQuantity: normalizedMinQuantity,
      unitPrice: normalizedUnitPrice,
      description: description || '',
      totalPrice: normalizedMinQuantity * normalizedUnitPrice
    };

    const updatedPriceSettings = [...this.data.currentProduct.priceSetting, newRule];

    updatedPriceSettings.sort((a, b) => a.minQuantity - b.minQuantity);

    this.setData({
      'currentProduct.priceSetting': updatedPriceSettings,
      tempPriceSetting: { minQuantity: 1, unitPrice: '', description: '' }
    });
  },

  toggleStatus() {
    const nextStatus = this.data.currentProduct.status === ProductStatus.PUBLISHED
      ? ProductStatus.UNPUBLISHED
      : ProductStatus.PUBLISHED;
    this.setData({
      'currentProduct.status': nextStatus
    });
  },

  removePriceRule(e) {
    const index = e.currentTarget.dataset.index;
    const settings = [...this.data.currentProduct.priceSetting];
    settings.splice(Number(index), 1);
    this.setData({ 'currentProduct.priceSetting': settings });
  },

  chooseImage() {
    if (this.data.isChoosingImage || this.data.isSubmitting) return;
    if (!wx.chooseMedia) {
      wx.showToast({ title: '暂时无法选择图片，请稍后重试', icon: 'none' });
      return;
    }
    const remainCount = 3 - this.data.currentProduct.pictureUrls.length;
    if (remainCount <= 0) {
      wx.showToast({ title: '最多上传 3 张商品图片', icon: 'none' });
      return;
    }

    this.setData({ isChoosingImage: true });
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      success: (res) => {
        const paths = (res.tempFiles || []).map(f => f.tempFilePath).filter(Boolean);
        if (paths.length === 0) {
          wx.showToast({ title: '未选择可用图片', icon: 'none' });
          return;
        }
        const nextUrls = [...this.data.currentProduct.pictureUrls, ...paths].slice(0, 3);
        this.setData({
          'currentProduct.pictureUrls': nextUrls
        });
      },
      fail: (err) => {
        const message = err && err.errMsg && err.errMsg.includes('cancel')
          ? '已取消选择图片'
          : '选择图片失败，请重试';
        wx.showToast({ title: message, icon: 'none' });
      },
      complete: () => {
        this.setData({ isChoosingImage: false });
      }
    });
  },
  removeImage(e) {
    if (this.data.isSubmitting) return;
    const idx = e.currentTarget.dataset.index;
    const urls = [...this.data.currentProduct.pictureUrls];
    urls.splice(idx, 1);
    this.setData({ 'currentProduct.pictureUrls': urls });
  },

  async addProductToList() {
    if (this.data.isSubmitting) return;
    if (this.data.pageErrorText) {
      wx.showToast({ title: this.data.pageErrorText, icon: 'none' });
      return;
    }
    const p = this.data.currentProduct;
    const error = ProductService.validateProduct(p, { requireImage: true });
    if (error) return wx.showToast({ title: error, icon: 'none' });

    this.setData({
      isSubmitting: true
    });
    if (p.pictureUrls && p.pictureUrls.length) {
      wx.showLoading({ title: '保存并上传图片...' });
    }

    const res = this.data.isEdit
      ? await ProductService.update(p)
      : await ProductService.create(p);
    this.setData({ isSubmitting: false });
    wx.hideLoading();
    if (!res.success) {
      wx.showToast({ title: res.error || '保存商品失败', icon: 'none' });
      return;
    }

    const eventChannel = this.getSafeEventChannel();
    if (eventChannel) {
      try {
        eventChannel.emit('refreshList', {
          success: true,
          product: res.data
        });
      } catch (err) {
        wx.showToast({ title: '商品已保存，返回刷新失败', icon: 'none' });
      }
    }

    const saveModeText = getSaveModeText(res.meta);
    this.setData({ saveModeText });
    wx.showToast({ title: saveModeText, icon: 'none' });
    navigateBackOrTab('/pages/productManagement/index');
  },
});
