import { ItineraryOrder } from './ItineraryOrder';
import { getStatusTextByValue, ItineraryStatus } from '~/enum/ItineraryStatus'

export class Itinerary {
  id: number;
  title: string;
  status: ItineraryStatus;
  statusText: string;
  description: string;
  itineraryOrders: ItineraryOrder[] = [];
  totalReceivable: number;
  totalReceived: number;
  totalCustomers: number;

  constructor(data: Partial<Itinerary> = {}) {
    this.id = data.id ?? -1;
    this.title = data.title ?? '';
    this.status = data.status ?? -1;
    this.statusText = getStatusTextByValue(data.status ?? ItineraryStatus.ALL);
    this.description = data.description ?? '';
    this.totalReceivable = data.totalReceivable ?? -1;
    this.totalReceived = data.totalReceived ?? -1;
    this.totalCustomers = data.totalCustomers ?? -1;

    const rawGoods = Array.isArray(data.itineraryOrders) ? data.itineraryOrders : [];
    this.itineraryOrders = rawGoods.map((item: ItineraryOrder) => new ItineraryOrder(item));
  }
}
