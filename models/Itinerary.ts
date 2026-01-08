import { Order } from './Order';
import { getStatusTextByValue } from '~/enum/ItineraryStatus'

export class Itinerary {
  id: number;
  title: string;
  status: number;
  statusText: string;
  description: string;
  orders: Order[] = [];
  totalReceivable: number;
  totalReceived: number;
  totalCustomers: number;

  constructor(data: Partial<Itinerary> = {}) {
    this.id = data.id ?? -1;
    this.title = data.title ?? '';
    this.status = data.status ?? -1;
    this.statusText = getStatusTextByValue(data.status ?? -1);
    this.description = data.description ?? '';
    this.totalReceivable = data.totalReceivable ?? -1;
    this.totalReceived = data.totalReceived ?? -1;
    this.totalCustomers = data.totalCustomers ?? -1;

    const rawGoods = Array.isArray(data.orders) ? data.orders : [];
    this.orders = rawGoods.map((item: Order) => new Order(item));
  }
}
