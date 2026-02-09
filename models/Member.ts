export class Member {
  id: number = 0;
  openid: string = '';
  name: string = '';
  email: string = '';
  phone: string = '';

  constructor(data: Partial<Member> = {}) {
    Object.assign(this, data);
  }
}