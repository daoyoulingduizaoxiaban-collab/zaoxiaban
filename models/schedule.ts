import { getStatusTextByValue } from '../utils/selectUtil';

export class Schedule {
  id: number;
  title: string;
  status: number;
  statusText: string;
  description: string;
  goods: Goods[] = [];

  constructor(data: Partial<Schedule> = {}) {
    this.id = data.id ?? 0;
    this.title = data.title ?? '';
    this.status = data.status ?? 0;
    this.statusText = data.statusText ?? "";
    this.description = data.description ?? '';

    const rawGoods = Array.isArray(data.goods) ? data.goods : [];
    this.goods = rawGoods.map((item: any) => new Goods(item));
  }
}

export class Goods {
  price: number;
  amountMin: number;
  amountMax: number;

  constructor(data: any = {}) {
    this.price = data.price ?? 0;
    this.amountMin = data.amountMin ?? 0;
    this.amountMax = data.amountMax ?? 0;
  }
}