import { OrderStatus, getOrderStatusTextByValue } from "~/enum/OrderStatus";
import { CustomerOrder } from '~/models/CustomerOrder'

export class ItineraryOrder {
  id: number;
  customerId: number;
  scheduleId: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  orderStatusText: string;
  customerOrder: CustomerOrder[] = []; // 訂單內的商品明細

  constructor(data: Partial<ItineraryOrder> = {}) {
    this.id = data.id ?? 0;
    this.customerId = data.customerId ?? 0;
    this.scheduleId = data.scheduleId ?? 0;
    this.totalAmount = data.totalAmount ?? 0;
    this.orderStatus = data.orderStatus ?? 0;
    this.orderStatusText = getOrderStatusTextByValue(data.orderStatus ?? OrderStatus.ALL);
    this.customerOrder = data.customerOrder ?? [];
  }

}