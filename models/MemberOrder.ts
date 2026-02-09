import { MemberOrderStatus } from '~/enum/MemberOrderStatus'
export class MemberOrder {
  id: number;
  userId: number;
  groupOrderId: number;
  status: MemberOrderStatus;
  totalPrice: number;
  originalTotalPrice: number;
  productList: CustomerProduct[] = [];
  memberRemark: string; // 客戶寫的備註
  hostRemark: string; // 導遊寫的備註


  constructor(data: Partial<MemberOrder> = {}) {
    this.id = data.id ?? -1;
    this.userId = data.userId ?? -1;
    this.groupOrderId = data.groupOrderId ?? -1;
    this.status = data.status ?? MemberOrderStatus.UNPAID;
    this.totalPrice = data.totalPrice ?? -1;
    this.originalTotalPrice = data.originalTotalPrice ?? -1;
    this.productList = data.productList ?? [];
    this.memberRemark = data.memberRemark ?? "";
    this.hostRemark = data.hostRemark ?? "";
  }
}

/* 客戶買的商品 */
export class CustomerProduct {
  productId: number;
  amount: number;
  totalPrice: number;
  originalTotalPrice: number;

  // 修改歷程欄位
  isAdjusted: boolean;
  adjustmentCount: number;
  lastAdjustmentTime?: Date;


  constructor(data: Partial<CustomerProduct> = {}) {
    this.productId = data.productId ?? -1;
    this.amount = data.amount ?? -1;
    this.totalPrice = data.totalPrice ?? -1;
    this.originalTotalPrice = data.originalTotalPrice ?? -1;
    this.isAdjusted = data.isAdjusted ?? false;
    this.adjustmentCount = data.adjustmentCount ?? 0;
    this.lastAdjustmentTime = data.lastAdjustmentTime;
  }
}