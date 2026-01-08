export class Guide {
  id: number;
  name: string;
  phone: string;
  licenseNumber: string;

  constructor(data: Partial<Guide> = {}) {
    this.id = data.id ?? 0;
    this.name = data.name ?? '';
    this.phone = data.phone ?? '';
    this.licenseNumber = data.licenseNumber ?? '';
  }
}