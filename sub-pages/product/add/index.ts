import { Product, PriceSetting } from '../../../models/Product';

Page({
  data: {
    // 初始化時直接使用你的 Constructor
    product: new Product({
      priceSetting: [new PriceSetting({ minQuantity: 1, unitPrice: 0 })]
    }),
    fileList: [] as any[]
  },

  // 1. 處理基本欄位 (title, description)
  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    // 取得目前的 product 實例
    const product = this.data.product;
    (product as any)[field] = value; // 直接修改物件屬性

    this.setData({ product });
  },

  // 2. 處理價格階梯輸入
  onPriceFieldChange(e: any) {
    const { index, field } = e.currentTarget.dataset;
    let { value } = e.detail;
    const product = this.data.product;
    const setting = product.priceSetting[index];

    // 轉型並賦值
    if (field === 'minQuantity' || field === 'unitPrice') {
      setting[field] = Number(value) || 0;
      // 自動計算 Model 裡的 totalPrice
      setting.totalPrice = setting.minQuantity * setting.unitPrice;
    } else {
      (setting as any)[field] = value;
    }

    this.setData({ product });
  },

  // 3. 新增價格階梯
  addPriceSetting() {
    const product = this.data.product;
    // 使用你的 Constructor 新增
    product.priceSetting.push(new PriceSetting({ minQuantity: 1, unitPrice: 0 }));
    this.setData({ product });
  },

  // 4. 刪除價格階梯
  removePriceSetting(e: any) {
    const { index } = e.currentTarget.dataset;
    const product = this.data.product;
    if (product.priceSetting.length > 1) {
      product.priceSetting.splice(index, 1);
      this.setData({ product });
    }
  },

  // 5. 圖片處理 (pictureUrls)
  onAddImage(e: any) {
    const { files } = e.detail;
    const product = this.data.product;
    
    // 將新圖片網址加入 Model
    const urls = files.map((f: any) => f.url);
    product.pictureUrls = [...product.pictureUrls, ...urls];
    
    this.setData({ 
      product,
      fileList: [...this.data.fileList, ...files]
    });
  },

  onSave() {
    console.log('當前 Product 物件資料：', this.data.product);
    // 這裡的 this.data.product 就會是包含所有輸入資料的完整物件
  }
});