import { Product } from './Product';
import { getGroupOrderStatusTextByValue, GroupOrderStatus } from '~/enum/GroupOrderStatus';
import { MemberOrder } from '~/models/MemberOrder';

export class GroupOrder {
  id: number = -1;
  title: string = '';
  status: GroupOrderStatus = GroupOrderStatus.OPEN;
  statusText: string = '';
  description: string = '';
  totalReceivable: number = 0;
  totalReceived: number = 0;
  totalCustomers: number = 0;
  qrCodeUrl: string = "";
  productList: Product[] = [];
  memberOrderList: MemberOrder[] = [];

  constructor(data: Partial<GroupOrder> = {}) {
    const { statusText, ...rest } = data;
    Object.assign(this, rest);

    if (data.productList) {
      this.productList = data.productList.map(item => new Product(item));
    }
    if (data.memberOrderList) {
      this.memberOrderList = data.memberOrderList.map(item => new MemberOrder(item));
    }

    this.refreshStatusText()
  }

  // 把邏輯抽出來
  refreshStatusText() {
    this.statusText = getGroupOrderStatusTextByValue(this.status);
  }
}

// 註：原本這裡有 recalculateTotals()，用「status===PAID 的 totalPrice」算已收、
// 應收含已取消訂單，與 services/groupOrder/groupOrderService.js 的口徑不同（那邊是
// 「status===CONFIRMED 的 confirmedAmount」、應收排除已取消）。且它依賴 memberOrderList，
// 而雲端該欄位恆為 []，已無執行路徑。口徑以 groupOrderService 為準，故移除，見 FIELD_DICT.md §5.4。