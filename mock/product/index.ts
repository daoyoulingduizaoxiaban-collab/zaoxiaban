import { Product } from '~/models/Product';
import { QaSeedMock } from '~/mock/qaSeed';

const getList = () => QaSeedMock.getProducts();

export const ProductMock = {
  fetchProductListMock(): Promise<{ code: number, data: Product[], message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          data: getList(),
          message: 'success',
        });
      }, 200);
    });
  },

  fetchById(id: number): Promise<{ code: number, data: Product }> {
    const data = getList().find(item => item.id === id);
    return new Promise(resolve => setTimeout(() => resolve({
      code: data ? 200 : 404,
      data: data || new Product({
        title: '未找到商品',
        description: 'QA 展示模式：未找到对应商品。',
      }),
    }), 200));
  },

  filterProductList(keyword: string, status: number): Promise<{ code: number, data: Product[], message: string }> {
    return new Promise((resolve) => {
      let filteredData = getList();

      if (status !== 0) {
        filteredData = filteredData.filter(item => item.status === status);
      }

      if (keyword && keyword !== '') {
        const lowerKeyword = keyword.toLowerCase();
        filteredData = filteredData.filter(item =>
          (item.title && item.title.toLowerCase().includes(lowerKeyword)) ||
          (item.description && item.description.toLowerCase().includes(lowerKeyword))
        );
      }

      setTimeout(() => {
        resolve({
          code: 200,
          data: filteredData,
          message: 'success',
        });
      }, 200);
    });
  },
};
