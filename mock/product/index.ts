import { PriceSetting, Product } from '~/models/Product';
import { ProductStatus } from '~/enum/ProductStatus';

const MOCK_LIST = [
  new Product({
    id: 1,
    status: ProductStatus.PUBLISHED,
    //providerId: 1,
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
    status: ProductStatus.UNPUBLISHED,
    //providerId: 2,
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
];


export const ProductMock = {
  fetchProductListMock(): Promise<{ code: number, data: Product[], message: string }> {
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

  fetchById(id: number): Promise<{ code: number, data: Product }> {
    const data = MOCK_LIST.find(item => item.id == id);
    return new Promise(resolve => setTimeout(() => resolve({
      code: 200,
      data: data || new Product()
    }), 300));
  },

  filterProductList(keyword: string, status: number): Promise<{ code: number, data: Product[], message: string }> {
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