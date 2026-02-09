import { PriceSetting, Product } from '~/models/Product';
import { CustomerProduct, MemberOrder } from '~/models/MemberOrder';
import { MemberOrderStatus } from '~/enum/MemberOrderStatus'
import { ProductStatus } from '~/enum/ProductStatus'
import { GroupOrder } from '../../models/GroupOrder';
import { GroupOrderStatus, getGroupOrderStatusTextByValue } from '~/enum/GroupOrderStatus';

const MOCK_LIST = [
  new GroupOrder({
    id: 1,
    title: '東北三日遊',
    status: GroupOrderStatus.OPEN,
    description: '你打的描述',
    totalReceivable: 10000,
    totalReceived: 500,
    totalCustomers: 20,
    qrCodeUrl: "https://quickchart.io/qr?text=HelloWeChat&size=200&margin=1",
    productList: [
      new Product({
        id: 1,
        status: ProductStatus.PUBLISHED,
        providerId: 1,
        title: "1號商品",
        pictureUrls: [
          "https://img.freepik.com/free-photo/3d-monsoon-season-sale_23-2150472588.jpg?semt=ais_user_personalization&w=740&q=80",
          "https://pic.616pic.com/ys_img/00/10/69/uCg7kpvLpD.jpg"
        ],
        priceSetting: [
          new PriceSetting({
            minQuantity: 1,
            unitPrice: 10,
            totalPrice: 10,
            description: "一個原價"
          }),
          new PriceSetting({
            minQuantity: 3,
            unitPrice: 9.5,
            totalPrice: 28.5,
            description: "三個便宜點"
          }),
          new PriceSetting({
            minQuantity: 5,
            unitPrice: 9,
            totalPrice: 45,
            description: "五個最便宜"
          })
        ],
        description: "1號商品說明文字"
      }),
      new Product({
        id: 2,
        status: ProductStatus.PUBLISHED,
        providerId: 2,
        title: "2號商品",
        pictureUrls: [
          "https://moozphoto.huhu.tw/wp-content/uploads/2024/05/0524-1-%E6%8B%B7%E8%B2%9D-34-600x900.jpg",
          "https://dl-file.cyberlink.com/web/content/b2626/ai%20product%20background.gif"
        ],
        priceSetting: [
          new PriceSetting({
            minQuantity: 1,
            unitPrice: 20,
            totalPrice: 20,
            description: "一個原價"
          }),
          new PriceSetting({
            minQuantity: 2,
            unitPrice: 14,
            totalPrice: 28,
            description: "三個便宜點"
          }),
          new PriceSetting({
            minQuantity: 5,
            unitPrice: 16,
            totalPrice: 80,
            description: "五個最便宜"
          })
        ],
        description: "1號商品說明文字"
      }),
    ],
    memberOrderList: [
      new MemberOrder({
        id:1,
        userId: 1,
        groupOrderId: 1,
        status: MemberOrderStatus.UNPAID,
        totalPrice: 1900,
        originalTotalPrice: 2000,
        memberRemark: "客人寫的備註",
        hostRemark: "開團人寫的備註",
        productList: [
          new CustomerProduct({
            productId: 1,
            amount: 4,
            totalPrice: 100,
            originalTotalPrice: 120,
            isAdjusted: true,
            adjustmentCount: 2,
            lastAdjustmentTime: new Date(2026, 2, 9, 14, 52, 46)
          }),
        ]
      })
    ]
  }),
  new GroupOrder({
    id: 2,
    title: '韓國首爾',
    status: GroupOrderStatus.OPEN,
    description: '我靜靜的看你要打什麼',
    totalReceivable: 4000,
    totalReceived: 1000,
    totalCustomers: 12,
    productList: [
      new Product({
        id: 1,
        status: ProductStatus.PUBLISHED,
        providerId: 1,
        title: "1號商品",
        pictureUrls: [
          "https://img.freepik.com/free-photo/3d-monsoon-season-sale_23-2150472588.jpg?semt=ais_user_personalization&w=740&q=80",
          "https://pic.616pic.com/ys_img/00/10/69/uCg7kpvLpD.jpg"
        ],
        priceSetting: [
          new PriceSetting({
            minQuantity: 1,
            unitPrice: 10,
            totalPrice: 10,
            description: "一個原價"
          }),
          new PriceSetting({
            minQuantity: 3,
            unitPrice: 9.5,
            totalPrice: 28.5,
            description: "三個便宜點"
          }),
          new PriceSetting({
            minQuantity: 5,
            unitPrice: 9,
            totalPrice: 45,
            description: "五個最便宜"
          })
        ],
        description: "1號商品說明文字"
      }),
      new Product({
        id: 2,
        status: ProductStatus.PUBLISHED,
        providerId: 2,
        title: "2號商品",
        pictureUrls: [
          "https://moozphoto.huhu.tw/wp-content/uploads/2024/05/0524-1-%E6%8B%B7%E8%B2%9D-34-600x900.jpg",
          "https://dl-file.cyberlink.com/web/content/b2626/ai%20product%20background.gif"
        ],
        priceSetting: [
          new PriceSetting({
            minQuantity: 1,
            unitPrice: 20,
            totalPrice: 20,
            description: "一個原價"
          }),
          new PriceSetting({
            minQuantity: 2,
            unitPrice: 14,
            totalPrice: 28,
            description: "三個便宜點"
          }),
          new PriceSetting({
            minQuantity: 5,
            unitPrice: 16,
            totalPrice: 80,
            description: "五個最便宜"
          })
        ],
        description: "1號商品說明文字"
      }),
    ],
    memberOrderList: [
      new MemberOrder({
        id:2,
        userId: 1,
        groupOrderId: 1,
        status: MemberOrderStatus.UNPAID,
        totalPrice: 1900,
        originalTotalPrice: 2000,
        memberRemark: "客人寫的備註",
        hostRemark: "開團人寫的備註",
        productList: [
          new CustomerProduct({
            productId: 1,
            amount: 4,
            totalPrice: 100,
            originalTotalPrice: 120,
            isAdjusted: true,
            adjustmentCount: 2,
            lastAdjustmentTime: new Date(2026, 2, 9, 14, 52, 46)
          }),
        ]
      }),
      new MemberOrder({
        id:3,
        userId: 1,
        groupOrderId: 1,
        status: MemberOrderStatus.UNPAID,
        totalPrice: 1900,
        originalTotalPrice: 2000,
        memberRemark: "客人寫的備註",
        hostRemark: "開團人寫的備註",
        productList: [
          new CustomerProduct({
            productId: 1,
            amount: 4,
            totalPrice: 100,
            originalTotalPrice: 120,
            isAdjusted: true,
            adjustmentCount: 2,
            lastAdjustmentTime: new Date(2026, 2, 9, 14, 52, 46)
          }),
        ]
      }),
      new MemberOrder({
        id:4,
        userId: 1,
        groupOrderId: 1,
        status: MemberOrderStatus.UNPAID,
        totalPrice: 1900,
        originalTotalPrice: 2000,
        memberRemark: "客人寫的備註",
        hostRemark: "開團人寫的備註",
        productList: [
          new CustomerProduct({
            productId: 1,
            amount: 4,
            totalPrice: 100,
            originalTotalPrice: 120,
            isAdjusted: true,
            adjustmentCount: 2,
            lastAdjustmentTime: new Date(2026, 2, 9, 14, 52, 46)
          }),
        ]
      })
    ]
  }),
  new GroupOrder({
    id: 3,
    title: '日本東京',
    status: GroupOrderStatus.STOPPED,
    description: 'say something',
    totalReceivable: 300,
    totalReceived: 0,
    totalCustomers: 1,
    productList: [
      new Product({
        id: 1,
        status: ProductStatus.PUBLISHED,
        providerId: 1,
        title: "1號商品",
        pictureUrls: [
          "https://img.freepik.com/free-photo/3d-monsoon-season-sale_23-2150472588.jpg?semt=ais_user_personalization&w=740&q=80",
          "https://pic.616pic.com/ys_img/00/10/69/uCg7kpvLpD.jpg"
        ],
        priceSetting: [
          new PriceSetting({
            minQuantity: 1,
            unitPrice: 10,
            totalPrice: 10,
            description: "一個原價"
          }),
          new PriceSetting({
            minQuantity: 3,
            unitPrice: 9.5,
            totalPrice: 28.5,
            description: "三個便宜點"
          }),
          new PriceSetting({
            minQuantity: 5,
            unitPrice: 9,
            totalPrice: 45,
            description: "五個最便宜"
          })
        ],
        description: "1號商品說明文字"
      }),
      new Product({
        id: 2,
        status: ProductStatus.PUBLISHED,
        providerId: 2,
        title: "2號商品",
        pictureUrls: [
          "https://moozphoto.huhu.tw/wp-content/uploads/2024/05/0524-1-%E6%8B%B7%E8%B2%9D-34-600x900.jpg",
          "https://dl-file.cyberlink.com/web/content/b2626/ai%20product%20background.gif"
        ],
        priceSetting: [
          new PriceSetting({
            minQuantity: 1,
            unitPrice: 20,
            totalPrice: 20,
            description: "一個原價"
          }),
          new PriceSetting({
            minQuantity: 2,
            unitPrice: 14,
            totalPrice: 28,
            description: "三個便宜點"
          }),
          new PriceSetting({
            minQuantity: 5,
            unitPrice: 16,
            totalPrice: 80,
            description: "五個最便宜"
          })
        ],
        description: "1號商品說明文字"
      }),
    ],
    memberOrderList: [
      new MemberOrder({
        id:5,
        userId: 3,
        groupOrderId: 3,
        status: MemberOrderStatus.UNPAID,
        totalPrice: 2600,
        originalTotalPrice: 3000,
        memberRemark: "yooooo",
        hostRemark: "hihihihihi",
        productList: [
          new CustomerProduct({
            productId: 1,
            amount: 4,
            totalPrice: 100,
            originalTotalPrice: 120,
            isAdjusted: true,
            adjustmentCount: 2,
            lastAdjustmentTime: new Date(2026, 2, 9, 14, 52, 46)
          }),
          new CustomerProduct({
            productId: 2,
            amount: 1,
            totalPrice: 10,
            originalTotalPrice: 12,
            isAdjusted: true,
            adjustmentCount: 1,
            lastAdjustmentTime: new Date(2026, 2, 10, 14, 52, 46)
          }),
        ]
      }),
      new MemberOrder({
        id:6,
        userId: 3,
        groupOrderId: 3,
        status: MemberOrderStatus.UNPAID,
        totalPrice: 2600,
        originalTotalPrice: 3000,
        memberRemark: "yooooo",
        hostRemark: "hihihihihi",
        productList: [
          new CustomerProduct({
            productId: 1,
            amount: 4,
            totalPrice: 100,
            originalTotalPrice: 120,
            isAdjusted: true,
            adjustmentCount: 2,
            lastAdjustmentTime: new Date(2026, 2, 9, 14, 52, 46)
          })
        ]
      })
    ]
  }),
];

export const GroupOrderMock = {
  fetchItineraryListMock(): Promise<{ code: number, data: GroupOrder[], message: string }> {
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

  fetchById(id: number): Promise<{ code: number, data: GroupOrder }> {
    const data = MOCK_LIST.find(item => item.id == id);
    return new Promise(resolve => setTimeout(() => resolve({
      code: 200,
      data: data || new GroupOrder({
        productList: []
      })
    }), 300));
  },

  filterItineraryList(keyword: string, status: number): Promise<{ code: number, data: GroupOrder[], message: string }> {
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