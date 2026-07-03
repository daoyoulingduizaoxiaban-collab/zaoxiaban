import { ProductStatus } from '~/enum/ProductStatus';
import { ProductService } from '~/services/product/productService';
import {
  CLOUD_SAVE_MODE,
  getSaveModeText,
  isCloudBusinessEnabled,
  LOCAL_SAVE_MODE_TEXT,
} from '~/repositories/cloudBusinessRepository';

Page({
  data: {
    pageTitle: '新增商品',
    productList: [], // 最終提交的大清單
    isSubmitting: false,
    isChoosingImage: false,
    saveModeText: LOCAL_SAVE_MODE_TEXT,
    imageModeTip: '演示保存会保留临时预览路径，不代表跨设备持久图片。',

    // 當前正在編輯的商品
    currentProduct: {
      id: 0,
      title: '',
      description: '',
      pictureUrls: [],
      priceSetting: [], // 這裡存放已加入的價格規則物件
      providerId: '',
      status: ProductStatus.PUBLISHED,
      sourceNote: ''
    },

    // 暫存：正在輸入的那一組價格規則 (對應你的 PriceSetting Class)
    tempPriceSetting: {
      minQuantity: 1,  // 預設 1
      unitPrice: '',
      description: ''
    }
  },

  onLoad() {
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
        ? '正式云端模式会先上传为持久图片，再保存商品。'
        : '演示保存会保留临时预览路径，不代表跨设备持久图片。',
    });
  },

  getSafeEventChannel() {
    try {
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (eventChannel && typeof eventChannel.emit === 'function') {
        return eventChannel;
      }
    } catch (err) {
      // Direct page entry has no opener event channel.
    }
    return null;
  },

  // 1. 處理商品基本資料輸入 (Title, Description)
  onProductInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`currentProduct.${field}`]: e.detail.value
    });
  },

  // 2. 處理價格規則輸入 (MinQty, UnitPrice, Desc)
  onPriceInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`tempPriceSetting.${field}`]: e.detail.value
    });
  },

  // 3. 按下「＋」：將暫存的價格規則加入 currentProduct.priceSetting
  addPriceRule() {
    const { minQuantity, unitPrice, description } = this.data.tempPriceSetting;

    // 驗證
    if (!minQuantity || minQuantity < 1) {
      return wx.showToast({ title: '起订量需大于 0', icon: 'none' });
    }
    if (!unitPrice || unitPrice < 0) {
      return wx.showToast({ title: '请输入有效单价', icon: 'none' });
    }

    // 建立新的規則物件 (符合你的 TypeScript 定義)
    const newRule = {
      minQuantity: parseInt(minQuantity), // 轉為數字
      unitPrice: parseFloat(unitPrice),   // 轉為數字
      description: description || '',
      totalPrice: parseInt(minQuantity) * parseFloat(unitPrice)
    };

    const updatedPriceSettings = [...this.data.currentProduct.priceSetting, newRule];

    // 排序：通常希望起訂量小的排前面 (1件 -> 10件 -> 50件)
    updatedPriceSettings.sort((a, b) => a.minQuantity - b.minQuantity);

    this.setData({
      'currentProduct.priceSetting': updatedPriceSettings,
      // 清空輸入框，但起訂量可以預設回 1
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

  // 移除某一條價格規則
  removePriceRule(e) {
    const index = e.currentTarget.dataset.index;
    const settings = this.data.currentProduct.priceSetting;
    settings.splice(index, 1);
    this.setData({ 'currentProduct.priceSetting': settings });
  },

  // 圖片處理 (與之前相同，略作簡化)
  chooseImage() {
    if (this.data.isChoosingImage || this.data.isSubmitting) return;
    if (!wx.chooseMedia) {
      wx.showToast({ title: '当前环境不支持选择图片', icon: 'none' });
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

  // 4. 按下「储存此商品」
  async addProductToList() {
    if (this.data.isSubmitting) return;
    const p = this.data.currentProduct;
    const error = ProductService.validateProduct(p);
    if (error) return wx.showToast({ title: error, icon: 'none' });

    this.setData({
      isSubmitting: true
    });
    if (p.pictureUrls && p.pictureUrls.length) {
      wx.showLoading({ title: '保存并上传图片...' });
    }

    const res = await ProductService.create(p);
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
    wx.navigateBack({
      fail: () => {
        wx.showToast({ title: '返回商品库失败', icon: 'none' });
      }
    });
  },
});
