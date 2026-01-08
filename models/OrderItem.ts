import { OrderItemStatus } from '~/enum/OrderItemStatus'
export class OrderItem {
  id: number;
  orderId: number;
  status: OrderItemStatus;
  goodsId: number;
  quantity: number;
  snapshotPrice: number; // 紀錄下單時的價格，避免商品調價影響舊訂單

  constructor(data: Partial<OrderItem> = {}) {
    this.id = data.id ?? -1;
    this.orderId = data.orderId ?? -1;
    this.status = data.status ?? -1;
    this.goodsId = data.goodsId ?? -1;
    this.quantity = data.quantity ?? -1;
    this.snapshotPrice = data.snapshotPrice ?? -1;
  }
}