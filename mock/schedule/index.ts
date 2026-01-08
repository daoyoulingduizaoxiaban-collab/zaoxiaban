import {
  Schedule // 修正匯入名稱，確保與你 export class Schedule 一致
} from '../../models/schedule';
import {
  ScheduleStatus, getStatusTextByValue
} from '../../utils/selectUtil';

// 使用 new Schedule() 封裝，這會自動觸發 constructor 裡的 || 預設值與 statusText 轉換
const MOCK_LIST = [
  new Schedule({
    id: 1,
    title: '東北三日遊',
    status: ScheduleStatus.OPEN,
    statusText: getStatusTextByValue(ScheduleStatus.OPEN),
    description: '你打的描述',
    // 注意：Model 裡定義的是 goods
    goods: [{
      price: 100,
      amountMin: 1,
      amountMax: 10
    }]
  }),
  new Schedule({
    id: 2,
    title: '韓國首爾',
    status: ScheduleStatus.OPEN,
    statusText: getStatusTextByValue(ScheduleStatus.OPEN),
    description: '我靜靜的看你要打什麼',
    goods: [{
      price: 100,
      amountMin: 1,
      amountMax: 10
    }]
  }),
  new Schedule({
    id: 3,
    title: '日本東京',
    status: ScheduleStatus.STOPPED,
    statusText: getStatusTextByValue(ScheduleStatus.STOPPED),
    description: 'say something',
    goods: [{
      price: 100,
      amountMin: 1,
      amountMax: 10
    }]
  }),
];

export const scheduleMock = {
  fetchScheduleListMock(): Promise<{ code: number, data: Schedule[], message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          data: MOCK_LIST, // 這裡傳出的已經是 Schedule 實例陣列
          message: 'success'
        });
      }, 500);
    });
  },

  fetchById(id: number): Promise<{ code: number, data: Schedule }> {
    const data = MOCK_LIST.find(item => item.id == id);
    return new Promise(resolve => setTimeout(() => resolve({
      code: 200,
      data: data || new Schedule({
        goods: []
      }) // 找不到時回傳一個空的實例，防止前端迭代報錯
    }), 300));
  },

  filterScheduleList(keyword: string, status: number): Promise<{ code: number, data: Schedule[], message: string }> {
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