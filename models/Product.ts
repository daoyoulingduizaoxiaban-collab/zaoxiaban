/* 商品設定檔 */
export class Product {
  id: number;
  prividerId:number;
  title: string;
  pictureUrls: string[];
  priceSetting: PriceSetting[];
  description: string;

  constructor(data: Partial<Product> = {}) {
    this.id = data.id ?? 0;
    this.prividerId = data.prividerId ?? 0;
    this.title = data.title ?? '';
    this.pictureUrls = data.pictureUrls ?? [];
    this.priceSetting = data.priceSetting ?? [];
    this.description = data.description ?? '';
  }
}

export class PriceSetting {
  /** 最小購買數量觸發門檻 */
  minQuantity: number;
  
  /** 該門檻下的單件價格 (Unit Price) */
  unitPrice: number;

  /** 選填：該組合的總價 (如買5個共230元，方便直接顯示) */
  totalPrice?: number;

  /** 優惠描述 (例如：滿5件打92折) */
  description?: string;

  constructor(data: Partial<PriceSetting> = {}) {
    this.minQuantity = data.minQuantity ?? 1;
    this.unitPrice = data.unitPrice ?? 0;
    this.totalPrice = data.totalPrice;
    this.description = data.description ?? '';
  }
}