import { OrderItemStatus } from '~/enum/OrderItemStatus'
import { CustomerGoods } from '~/models/CustomerGoods'
export class CustomerOrder {
  id: number;
  itineraryOrderId: number;
  status: OrderItemStatus;
  snapshotPrice: number; // 紀錄下單時的價格，避免商品調價影響舊訂單
  goodsList: CustomerGoods[] = [];

  constructor(data: Partial<CustomerOrder> = {}) {
    this.id = data.id ?? -1;
    this.itineraryOrderId = data.itineraryOrderId ?? -1;
    this.status = data.status ?? OrderItemStatus.UNPAID;
    this.snapshotPrice = data.snapshotPrice ?? -1;
    this.goodsList = data.goodsList ?? [];
  }
}