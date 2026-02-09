Page({
  data: {
    pageTitle:'商品管理',
    productList: [], // 最終提交的大清單

    // 當前正在編輯的商品
    currentProduct: {
      id: 0,
      title: '',
      description: '',
      pictureUrls: [],
      priceSetting: [], // 這裡存放已加入的價格規則物件
      providerId: 0, 
      status: 0
    },

    // 暫存：正在輸入的那一組價格規則 (對應你的 PriceSetting Class)
    tempPriceSetting: {
      minQuantity: 1,  // 預設 1
      unitPrice: '',
      description: ''
    }
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
      return wx.showToast({ title: '起訂量需大於0', icon: 'none' });
    }
    if (!unitPrice || unitPrice < 0) {
      return wx.showToast({ title: '請輸入有效單價', icon: 'none' });
    }

    // 建立新的規則物件 (符合你的 TypeScript 定義)
    const newRule = {
      minQuantity: parseInt(minQuantity), // 轉為數字
      unitPrice: parseFloat(unitPrice),   // 轉為數字
      description: description || '',
      // totalPrice: (選填，前端可以不傳，或自動計算 minQuantity * unitPrice)
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

  // 4. 按下「儲存此商品」
  addProductToList() {
    const p = this.data.currentProduct;
    
    if (!p.title) return wx.showToast({ title: '請輸入商品名稱', icon: 'none' });
    if (p.priceSetting.length === 0) return wx.showToast({ title: '請至少設定一組價格', icon: 'none' });
  
    // 價格顯示字串計算
    const prices = p.priceSetting.map(x => x.unitPrice);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const priceDisplay = (minP === maxP) ? `$${minP}` : `$${minP} ~ $${maxP}`;
  
    const newProduct = {
      ...p,
      id: Date.now(),
      priceDisplay: priceDisplay
    };
  
    this.setData({
      productList: [...this.data.productList, newProduct],
      // 清空表單
      currentProduct: {
        id: 0, title: '', description: '', 
        pictureUrls: [], // 確保這裡重置為空陣列
        priceSetting: [], providerId: 123, status: 0
      },
      tempPriceSetting: { minQuantity: 1, unitPrice: '', description: '' }
    });
  },

  removeProduct(e) {
    const idx = e.currentTarget.dataset.index;
    const list = this.data.productList;
    list.splice(idx, 1);
    this.setData({ productList: list });
  },

  submitGroup() {
    console.log('提交 Payload:', this.data.productList);
    // 這裡提交的資料結構就會完全符合你的 Product 與 PriceSetting 定義
  }
});