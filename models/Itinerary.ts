import { CustomerOrder } from './CustomerOrder';
import { getStatusTextByValue, ItineraryStatus } from '~/enum/ItineraryStatus'

export class Itinerary {
  id: number;
  title: string;
  status: ItineraryStatus;
  statusText: string;
  description: string;
  customerOrderList: CustomerOrder[] = [];
  totalReceivable: number;
  totalReceived: number;
  totalCustomers: number;
  qrCodeUrl: string;

  constructor(data: Partial<Itinerary> = {}) {
    this.id = data.id ?? -1;
    this.title = data.title ?? '';
    this.status = data.status ?? -1;
    this.statusText = getStatusTextByValue(data.status ?? ItineraryStatus.ALL);
    this.description = data.description ?? '';
    this.totalReceivable = data.totalReceivable ?? -1;
    this.totalReceived = data.totalReceived ?? -1;
    this.totalCustomers = data.totalCustomers ?? -1;
    this.qrCodeUrl = data.qrCodeUrl ?? "";

    const rawGoods = Array.isArray(data.customerOrderList) ? data.customerOrderList : [];
    this.customerOrderList = rawGoods.map((item: CustomerOrder) => new CustomerOrder(item));
  }
}
