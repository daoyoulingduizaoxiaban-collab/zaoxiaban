export class Host {
  id: number = 0;
  openid: string = '';
  name: string = '';
  phone: string = '';
  licenseNumber: string = '';

  constructor(data: Partial<Host> = {}) {
    Object.assign(this, data);
  }
}