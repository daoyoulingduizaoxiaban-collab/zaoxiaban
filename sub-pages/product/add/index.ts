import { ProductStatus } from '~/enum/ProductStatus';
import { ProductService } from '~/services/product/productService';
import { AuthService } from '~/services/auth/authService';
import { FEATURE_KEYS, canUseFeature, getRoleScopeText } from '~/services/auth/roleScope';
import {
  CLOUD_SAVE_MODE,
  getSaveModeText,
  isCloudBusinessEnabled,
} from '~/repositories/cloudBusinessRepository';
import { navigateBackOrTab } from '~/utils/navigation';
import { useAccessPage } from '~/behaviors/useAccessPage';
import { RESULT_TEXT, toastSuccess } from '~/utils/feedback';

Page({
  behaviors: [useAccessPage],
  data: {
    pageTitle: '商品表单',
    isEdit: false,
    isSubmitting: false,
    isChoosingImage: false,
    accessDenied: false,
    accessStateText: '',
    saveModeText: '',
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

  async onLoad(options) {
    await AuthService.refreshSession();
    if ((this as any).requireLogin()) return;
    const profile = AuthService.getCurrentProfile();
    const canCreate = canUseFeature(profile, FEATURE_KEYS.PRODUCT_MANAGE);
    if (!canCreate) {
      this.setData({
        accessDenied: true,
        accessStateText: getRoleScopeText(profile, FEATURE_KEYS.PRODUCT_MANAGE),
        ...(this as any).threeState('ready'),
      });
      return;
    }
    const productId = options && options.id ? String(options.id) : '';
    if (productId) {
      this.setData({ pageTitle: '编辑商品', isEdit: true, ...(this as any).loadingState() });
      await this.loadProduct(productId);
    } else {
      this.setData({ pageTitle: '新增商品', isEdit: false, ...(this as any).threeState('ready') });
    }
    this.refreshSaveModeText();
  },

  async onShow() {
    await AuthService.refreshSession();
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
        saveModeText: errorText,
        ...(this as any).threeState('error', { errorText }),
      });
      wx.showToast({ title: errorText, icon: 'none' });
      return;
    }

    this.setData({
      currentProduct: {
        ...this.data.currentProduct,
        ...res.data,
        id: res.data.id || res.data._id || productId,
        pictureUrls: res.data.pictureUrls || [],
        priceSetting: res.data.priceSetting || res.data.priceSettings || [],
      },
      saveModeText: getSaveModeText(res.meta),
      ...(this as any).threeState('ready'),
    });
  },

  // page-state 的重试：只有「读既有商品失败」会进 error 态，重读它即可。
  onRetry() {
    const id = this.data.currentProduct && this.data.currentProduct.id;
    if (!id) return;
    this.setData((this as any).loadingState());
    this.loadProduct(id);
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

  // 第一档强制是「1 件」基准价；之后每加一档，数量、总价都必须比上一档大
  // （不然「买多变更贵/一样贵」不合理，也没办法算最优组合）。
  addPriceRule() {
    const existing = this.data.currentProduct.priceSetting;
    const isFirstTier = existing.length === 0;
    const { unitPrice, description } = this.data.tempPriceSetting;
    const normalizedMinQuantity = isFirstTier ? 1 : Number(this.data.tempPriceSetting.minQuantity);
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

    const lastRule = existing[existing.length - 1];
    if (lastRule) {
      if (newRule.minQuantity <= lastRule.minQuantity) {
        return wx.showToast({ title: `起订量需大于上一档（${lastRule.minQuantity} 件）`, icon: 'none' });
      }
      if (newRule.totalPrice <= lastRule.totalPrice) {
        return wx.showToast({ title: `总价需大于上一档（¥${lastRule.totalPrice}）`, icon: 'none' });
      }
    }

    this.setData({
      'currentProduct.priceSetting': [...existing, newRule],
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
    const index = Number(e.currentTarget.dataset.index);
    // 第一档（1 件）是后面所有档次的比较基准，删掉它等于整组价格档都要重填，一起清空。
    const settings = index === 0 ? [] : this.data.currentProduct.priceSetting.filter((_, i) => i !== index);
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
    if (this.data.loadErrorText) {
      wx.showToast({ title: this.data.loadErrorText, icon: 'none' });
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

    this.setData({ saveModeText: getSaveModeText(res.meta) });
    toastSuccess(this.data.isEdit ? RESULT_TEXT.save : RESULT_TEXT.create);
    setTimeout(() => navigateBackOrTab('/pages/productManagement/index'), 300);
  },
});
