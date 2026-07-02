import { ProductStatus } from '~/enum/ProductStatus';
import { ProductService } from '~/services/product/productService';
import { getSaveModeText } from '~/repositories/cloudBusinessRepository';

Page({
  data: {
    pageTitle: '新增商品',
    productList: [], // 最終提交的大清單
    isSubmitting: false,
    saveModeText: '本地/QA 展示模式，尚未正式保存',

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
    wx.chooseMedia({
      count: 3, mediaType: ['image'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          'currentProduct.pictureUrls': [...this.data.currentProduct.pictureUrls, ...paths]
        });
      }
    });
  },
  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const urls = this.data.currentProduct.pictureUrls;
    urls.splice(idx, 1);
    this.setData({ 'currentProduct.pictureUrls': urls });
  },

  // 4. 按下「储存此商品」
  async addProductToList() {
    const p = this.data.currentProduct;
    const error = ProductService.validateProduct(p);
    if (error) return wx.showToast({ title: error, icon: 'none' });

    this.setData({
      isSubmitting: true
    });

    const res = await ProductService.create(p);
    this.setData({ isSubmitting: false });
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
