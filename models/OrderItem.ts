export class OrderItem {
  id: number;
  orderId: number;
  goodsId: number;
  quantity: number;
  snapshotPrice: number; // 紀錄下單時的價格，避免商品調價影響舊訂單

  constructor(data: Partial<OrderItem> = {}) {
    this.id = data.id ?? 0;
    this.orderId = data.orderId ?? 0;
    this.goodsId = data.goodsId ?? 0;
    this.quantity = data.quantity ?? 1;
    this.snapshotPrice = data.snapshotPrice ?? 0;
  }
}