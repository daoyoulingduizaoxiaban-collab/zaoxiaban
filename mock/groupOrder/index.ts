import { GroupOrder } from '~/models/GroupOrder';
import { GroupOrderStatus, getGroupOrderStatusTextByValue } from '~/enum/GroupOrderStatus';
import { QaSeedMock } from '~/mock/qaSeed';

const getList = () => QaSeedMock.getGroupOrders();

export const GroupOrderMock = {
  fetchItineraryListMock(): Promise<{ code: number, data: GroupOrder[], message: string }> {
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

  fetchGroupOrderListMock(): Promise<{ code: number, data: GroupOrder[], message: string }> {
    return this.fetchItineraryListMock();
  },

  fetchById(id: number): Promise<{ code: number, data: GroupOrder }> {
    const data = getList().find(item => item.id === id);
    return new Promise(resolve => setTimeout(() => resolve({
      code: data ? 200 : 404,
      data: data || new GroupOrder({
        title: '未找到团单',
        status: GroupOrderStatus.STOPPED,
        statusText: getGroupOrderStatusTextByValue(GroupOrderStatus.STOPPED),
        description: 'QA 展示模式：未找到对应团单，请从团单列表重新进入。',
        productList: [],
        memberOrderList: [],
      }),
    }), 200));
  },

  filterItineraryList(keyword: string, status: number): Promise<{ code: number, data: GroupOrder[], message: string }> {
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
