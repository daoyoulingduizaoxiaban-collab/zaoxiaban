import { OrderItemStatus } from '~/enum/OrderItemStatus'
import { CustomerGoods } from '~/models/CustomerGoods'
export class CustomerOrder {
  itineraryId: number;
  id: number;
  status: OrderItemStatus;
  totalPrice: number; 
  customerGoodsList: CustomerGoods[] = [];

  constructor(data: Partial<CustomerOrder> = {}) {
    this.itineraryId = data.itineraryId ?? -1;
    this.id = data.id ?? -1;
    this.status = data.status ?? OrderItemStatus.UNPAID;
    this.totalPrice = data.totalPrice ?? -1;
    this.customerGoodsList = data.customerGoodsList ?? [];
  }
}