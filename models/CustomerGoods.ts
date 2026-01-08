export class CustomerGoods {
  goodsId: number;
  amount: number;
  totalPrice: number;


  constructor(data: Partial<CustomerGoods> = {}) {
    this.goodsId = data.goodsId ?? -1;
    this.amount = data.amount ?? -1;
    this.totalPrice = data.totalPrice ?? -1;

  }
}