import { ProductStatus } from '../enum/ProductStatus';

/* 商品設定檔 */
export class Product {
  id: number = 0;
  status: ProductStatus = 0;
  providerId: number = 0; 
  title: string = '';
  pictureUrls: string[] = [];
  priceSetting: PriceSetting[] = [];
  description: string = '';

  constructor(data: Partial<Product> = {}) {
    // 2. 自動對應原始資料
    Object.assign(this, data);

    // 3. 處理深層物件實例化，確保能使用 PriceSetting 的方法 (如有)
    if (data.priceSetting) {
      this.priceSetting = data.priceSetting.map(item => new PriceSetting(item));
    }
  }
}

export class PriceSetting {
  /** 最小購買數量觸發門檻 */
  minQuantity: number = 1;

  /** 該門檻下的單件價格 (Unit Price) */
  unitPrice: number = 0;

  /** 選填：該組合的總價 */
  totalPrice?: number;

  /** 優惠描述 */
  description: string = '';

  constructor(data: Partial<PriceSetting> = {}) {
    // 自動對應
    Object.assign(this, data);
  }
  
  // 既然你是 C# 背景，這裡可以加一個邏輯方法，方便 UI 顯示
  // 例如：自動生成「滿 5 件，單價 $46」的文字
  get label(): string {
    return `滿 ${this.minQuantity} 件，單價 $${this.unitPrice}`;
  }
}