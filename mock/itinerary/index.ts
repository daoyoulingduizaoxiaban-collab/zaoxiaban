import { Order } from '~/models/Order';
import { OrderItem } from '~/models/OrderItem';
import {
  Itinerary
} from '../../models/Itinerary';
import {
  ItineraryStatus, getStatusTextByValue
} from '~/enum/ItineraryStatus';

const MOCK_LIST = [
  new Itinerary({
    id: 1,
    title: '東北三日遊',
    status: ItineraryStatus.OPEN,
    statusText: getStatusTextByValue(ItineraryStatus.OPEN),
    description: '你打的描述',
    totalReceivable: 10000,
    totalReceived: 500,
    totalCustomers: 20,
    orders: [
      new Order({
        id: 1,
        customerId: 1,
        scheduleId: 1,
        totalAmount: 2,
        orderStatus: 0,
        items: [new OrderItem({
          id: 1,
          orderId: 1,
          goodsId: 1,
          quantity: 2,
          snapshotPrice: 30,
        })],
      }),
      // new Order({
      //   id: 2,
      //   customerId: 2,
      //   scheduleId: 2,
      //   totalAmount: 3,
      //   orderStatus: 1,
      //   items: [new OrderItem({
      //     id: 1,
      //     orderId: 1,
      //     goodsId: 1,
      //     quantity: 2,
      //     snapshotPrice: 30,
      //   })],
      // })
    ]
  }),
  new Itinerary({
    id: 2,
    title: '韓國首爾',
    status: ItineraryStatus.OPEN,
    statusText: getStatusTextByValue(ItineraryStatus.OPEN),
    description: '我靜靜的看你要打什麼',
    totalReceivable: 10000,
    totalReceived: 500,
    totalCustomers: 20, orders: [
      new Order({
        id: 1,
        customerId: 1,
        scheduleId: 1,
        totalAmount: 2,
        orderStatus: 0,
        items: [new OrderItem({
          id: 1,
          orderId: 1,
          goodsId: 1,
          quantity: 2,
          snapshotPrice: 30,
        })],
      })
    ]
  }),
  new Itinerary({
    id: 3,
    title: '日本東京',
    status: ItineraryStatus.STOPPED,
    statusText: getStatusTextByValue(ItineraryStatus.STOPPED),
    description: 'say something',
    totalReceivable: 10000,
    totalReceived: 500,
    totalCustomers: 20, orders: [
      new Order({
        id: 1,
        customerId: 1,
        scheduleId: 1,
        totalAmount: 2,
        orderStatus: 0,
        items: [],
      })
    ]
  }),
];

export const ItineraryMock = {
  fetchItineraryListMock(): Promise<{ code: number, data: Itinerary[], message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          data: MOCK_LIST,
          message: 'success'
        });
      }, 500);
    });
  },

  fetchById(id: number): Promise<{ code: number, data: Itinerary }> {
    const data = MOCK_LIST.find(item => item.id == id);
    return new Promise(resolve => setTimeout(() => resolve({
      code: 200,
      data: data || new Itinerary({
        orders: []
      })
    }), 300));
  },

  filterItineraryList(keyword: string, status: number): Promise<{ code: number, data: Itinerary[], message: string }> {
    return new Promise((resolve) => {
      let filteredData = MOCK_LIST;

      if (status != 0) {
        filteredData = filteredData.filter(item => item.status === status);
      }

      if (keyword && keyword != "") {
        let lowerKeyword = keyword.toLowerCase();
        filteredData = filteredData.filter(item =>
          (item.title && item.title.toLowerCase().includes(lowerKeyword)) ||
          (item.description && item.description.toLowerCase().includes(lowerKeyword))
        );
      }

      setTimeout(() => {
        resolve({
          code: 200,
          data: filteredData,
          message: 'success'
        });
      }, 300);
    });
  }
};