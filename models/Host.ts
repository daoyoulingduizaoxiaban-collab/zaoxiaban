export class Host {
  id: number;
  openid: string;
  name: string;
  phone: string;
  licenseNumber: string;

  constructor(data: Partial<Host> = {}) {
    this.id = data.id ?? 0;
    this.openid = data.openid ?? '';
    this.name = data.name ?? '';
    this.phone = data.phone ?? '';
    this.licenseNumber = data.licenseNumber ?? '';
  }
}