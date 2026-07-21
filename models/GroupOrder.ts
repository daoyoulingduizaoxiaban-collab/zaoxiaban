import { Product } from './Product';
import { getGroupOrderStatusTextByValue, GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { MemberOrder } from '~/models/MemberOrder';
import { MemberOrderStatus } from '~/enum/MemberOrderStatus';

export class GroupOrder {
  id: number = -1;
  title: string = '';
  status: GroupOrderStatus = GroupOrderStatus.OPEN;
  statusText: string = '';
  description: string = '';
  totalReceivable: number = 0;
  totalReceived: number = 0;
  totalCustomers: number = 0;
  qrCodeUrl: string = "";
  productList: Product[] = [];
  memberOrderList: MemberOrder[] = [];

  constructor(data: Partial<GroupOrder> = {}) {
    const { statusText, ...rest } = data;
    Object.assign(this, rest);

    if (data.productList) {
      this.productList = data.productList.map(item => new Product(item));
    }
    if (data.memberOrderList) {
      this.memberOrderList = data.memberOrderList.map(item => new MemberOrder(item));
    }

    this.refreshStatusText()
  }

  // 把邏輯抽出來
  refreshStatusText() {
    this.statusText = getGroupOrderStatusTextByValue(this.status);
  }

  /**
   * 核心邏輯：重新計算統計數據
   * 當手動調整訂單金額後呼叫
   */
  recalculateTotals(): void {
    // 應收：所有訂單 totalPrice 的加總
    this.totalReceivable = this.memberOrderList.reduce((sum, order) => {
      const price = order.totalPrice > 0 ? order.totalPrice : 0;
      return sum + price;
    }, 0);

    // 已收：僅加總已付款訂單的金額 (假設欄位為 isPaid)
    this.totalReceived = this.memberOrderList.reduce((sum, order) => {
      if (order.status === MemberOrderStatus.PAID && order.totalPrice > 0) {
        return sum + order.totalPrice;
      }
      return sum;
    }, 0);

    this.totalCustomers = this.memberOrderList.length;
  }
}