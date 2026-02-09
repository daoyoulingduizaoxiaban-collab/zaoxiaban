import { MemberOrderStatus } from '~/enum/MemberOrderStatus';

export class MemberOrder {
  // 1. 屬性宣告與預設值
  id: number = -1;
  userId: number = -1;
  groupOrderId: number = -1;
  status: MemberOrderStatus = MemberOrderStatus.UNPAID;
  totalPrice: number = -1;
  originalTotalPrice: number = 0;
  productList: CustomerProduct[] = [];
  memberRemark: string = "";
  hostRemark: string = "";

  constructor(data: Partial<MemberOrder> = {}) {
    Object.assign(this, data);

    if (data.productList) {
      this.productList = data.productList.map(item => new CustomerProduct(item));
    }
  }

  // 既然要轉型為「團訂」，可以增加一個判斷是否已支付的方法
  get isPaid(): boolean {
    return this.status === MemberOrderStatus.PAID;
  }
}

/* 客戶買的商品 */
export class CustomerProduct {
  productId: number = -1;
  amount: number = 0;
  totalPrice: number = 0;
  originalTotalPrice: number = 0;

  // 修改歷程欄位
  isAdjusted: boolean = false;
  adjustmentCount: number = 0;
  lastAdjustmentTime?: Date;

  constructor(data: Partial<CustomerProduct> = {}) {
    // 自動對應
    Object.assign(this, data);

    // 處理日期格式轉換 (如果是從 JSON 讀取，Date 會變成 string)
    if (data.lastAdjustmentTime) {
      this.lastAdjustmentTime = new Date(data.lastAdjustmentTime);
    }
  }

  /**
   * 業務邏輯：手動調整金額
   * 封裝後，你在 Page.ts 呼叫時會非常簡潔
   */
  adjustPrice(newPrice: number): void {
    if (newPrice !== this.totalPrice) {
      this.totalPrice = newPrice;
      this.isAdjusted = true; // 標記已修改
      this.adjustmentCount++; // 累加修改次數
      this.lastAdjustmentTime = new Date(); // 更新修改時間
    }
  }
}