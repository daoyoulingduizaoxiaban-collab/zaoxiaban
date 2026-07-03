import { ProductStatus } from '../enum/ProductStatus';

/* 商品設定檔 */
export class Product {
  id: number = 0;
  ownerUserId: number = 0;
  providerId: string | number = '';
  status: ProductStatus = 0;
  title: string = '';
  pictureUrls: string[] = [];
  priceSetting: PriceSetting[] = [];
  description: string = '';
  sourceNote: string = '';
  priceDisplay: string = '';
  createdAt: string = '';
  updatedAt: string = '';
  deletedAt: string = '';

  constructor(data: Partial<Product> = {}) {
    Object.assign(this, data);

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
    Object.assign(this, data);
  }

  get label(): string {
    return `滿 ${this.minQuantity} 件，單價 $${this.unitPrice}`;
  }
}
