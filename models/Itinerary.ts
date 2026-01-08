import { Order } from './Order';
import { getStatusTextByValue } from '~/enum/ItineraryStatus'

export class Itinerary {
  id: number;
  title: string;
  status: number;
  statusText: string;
  description: string;
  orders: Order[] = [];

  constructor(data: Partial<Itinerary> = {}) {
    this.id = data.id ?? 0;
    this.title = data.title ?? '';
    this.status = data.status ?? 0;
    this.statusText = getStatusTextByValue(data.status ?? -1);
    this.description = data.description ?? '';

    const rawGoods = Array.isArray(data.orders) ? data.orders : [];
    this.orders = rawGoods.map((item: Order) => new Order(item));
  }
}
