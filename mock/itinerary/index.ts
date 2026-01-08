import { CustomerOrder } from '~/models/CustomerOrder';
import { CustomerGoods } from '~/models/CustomerGoods';
import { CustomerOrderStatus } from '~/enum/OrderItemStatus'
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
    qrCodeUrl:"https://quickchart.io/qr?text=HelloWeChat&size=200&margin=1",
    customerOrderList: [
      new CustomerOrder({
        itineraryId: 1,
        id: 1,
        status: CustomerOrderStatus.UNPAID,
        totalPrice: 1000,
        customerGoodsList: [new CustomerGoods({
          goodsId: 1,
          amount: 5,
          totalPrice: 2000,
        })]
      }),
      new CustomerOrder({
        itineraryId: 1,
        id: 1,
        status: CustomerOrderStatus.PAID,
        totalPrice: 1000,
        customerGoodsList: [new CustomerGoods({
          goodsId: 1,
          amount: 5,
          totalPrice: 2000,
        })]
      }),
      new CustomerOrder({
        itineraryId: 1,
        id: 1,
        status: CustomerOrderStatus.CONFIRMED,
        totalPrice: 1000,
        customerGoodsList: [new CustomerGoods({
          goodsId: 1,
          amount: 5,
          totalPrice: 2000,
        })]
      }),
      new CustomerOrder({
        itineraryId: 1,
        id: 1,
        status: CustomerOrderStatus.CANCELLED,
        totalPrice: 1000,
        customerGoodsList: [new CustomerGoods({
          goodsId: 1,
          amount: 5,
          totalPrice: 2000,
        })]
      }),
    ]
  }),
  new Itinerary({
    id: 2,
    title: '韓國首爾',
    status: ItineraryStatus.OPEN,
    statusText: getStatusTextByValue(ItineraryStatus.OPEN),
    description: '我靜靜的看你要打什麼',
    totalReceivable: 4000,
    totalReceived: 1000,
    totalCustomers: 12,
    customerOrderList: [
      new CustomerOrder({
        itineraryId: 2,
        id: 2,
        status: CustomerOrderStatus.UNPAID,
        totalPrice: 500,
        customerGoodsList: [
          new CustomerGoods({
            goodsId: 2,
            amount: 4,
            totalPrice: 20,
          }),
          new CustomerGoods({
            goodsId: 2,
            amount: 6,
            totalPrice: 40,
          }),
        ]

      }),
      new CustomerOrder({
        itineraryId: 2,
        id: 2,
        status: CustomerOrderStatus.UNPAID,
        totalPrice: 500,
        customerGoodsList: [
          new CustomerGoods({
            goodsId: 2,
            amount: 4,
            totalPrice: 20,
          }),
          new CustomerGoods({
            goodsId: 2,
            amount: 6,
            totalPrice: 40,
          }),
        ]

      }),
    ]
  }),
  new Itinerary({
    id: 3,
    title: '日本東京',
    status: ItineraryStatus.STOPPED,
    statusText: getStatusTextByValue(ItineraryStatus.STOPPED),
    description: 'say something',
    totalReceivable: 300,
    totalReceived: 0,
    totalCustomers: 1,
    customerOrderList: [
      new CustomerOrder({
        itineraryId: 1,
        id: 1,
        status: CustomerOrderStatus.UNPAID,
        totalPrice: 1000,
        customerGoodsList: [new CustomerGoods({
          goodsId: 1,
          amount: 5,
          totalPrice: 2000,
        })]
      }),
      new CustomerOrder({
        itineraryId: 2,
        id: 2,
        status: CustomerOrderStatus.UNPAID,
        totalPrice: 500,
        customerGoodsList: [
          new CustomerGoods({
            goodsId: 2,
            amount: 4,
            totalPrice: 20,
          }),
          new CustomerGoods({
            goodsId: 2,
            amount: 6,
            totalPrice: 40,
          }),
        ]

      }),
      new CustomerOrder({
        itineraryId: 2,
        id: 2,
        status: CustomerOrderStatus.UNPAID,
        totalPrice: 2500,
        customerGoodsList: [
          new CustomerGoods({
            goodsId: 2,
            amount: 4,
            totalPrice: 20,
          }),
          new CustomerGoods({
            goodsId: 2,
            amount: 6,
            totalPrice: 40,
          }),
        ]

      }),
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
        customerOrderList: []
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