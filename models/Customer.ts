export class Customer {
  id: number;
  openid: string;
  name: string;
  email: string;
  phone: string;

  constructor(data: Partial<Customer> = {}) {
    this.id = data.id ?? 0;
    this.openid = data.openid ?? '';
    this.name = data.name ?? '';
    this.email = data.email ?? '';
    this.phone = data.phone ?? '';
  }
}