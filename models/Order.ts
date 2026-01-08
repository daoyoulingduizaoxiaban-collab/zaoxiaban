import { OrderStatus, getOrderStatusTextByValue } from "~/enum/OrderStatus";

export class Order {
  id: number;
  customerId: number;
  scheduleId: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  orderStatusText: string;
  items: Order[] = []; // 訂單內的商品明細

  constructor(data: Partial<Order> = {}) {
    this.id = data.id ?? 0;
    this.customerId = data.customerId ?? 0;
    this.scheduleId = data.scheduleId ?? 0;
    this.totalAmount = data.totalAmount ?? 0;
    this.orderStatus = data.orderStatus ?? 0;
    this.orderStatusText = getOrderStatusTextByValue(data.orderStatus ?? -1);
    this.items = data.items ?? [];
  }

}