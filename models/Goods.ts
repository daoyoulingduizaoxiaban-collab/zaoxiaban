export class Goods {
  id: number;
  title: string;
  price: number;
  description: string;

  constructor(data: Partial<Goods> = {}) {
    this.id = data.id ?? 0;
    this.title = data.title ?? '';
    this.price = data.price ?? 0;
    this.description = data.description ?? '';
  }
}