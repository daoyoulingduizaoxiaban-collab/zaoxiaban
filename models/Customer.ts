export class Customer {
  id: number;
  name: string;
  email: string;
  phone: string;

  constructor(data: Partial<Customer> = {}) {
    this.id = data.id ?? 0;
    this.name = data.name ?? '';
    this.email = data.email ?? '';
    this.phone = data.phone ?? '';
  }
}