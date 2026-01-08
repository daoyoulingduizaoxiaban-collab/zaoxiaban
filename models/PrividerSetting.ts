export class PrividerSetting {
  id: number;
  name: string;
  description: string;

  constructor(data: Partial<PrividerSetting> = {}) {
    this.id = data.id ?? 0;
    this.name = data.name ?? '';
    this.description = data.description ?? '';
  }
}