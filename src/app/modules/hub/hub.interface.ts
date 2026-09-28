export interface ICreateHub {
  code: string;
  name: string;
  address: string;
  zoneId: number;
}

export interface IUpdateHub {
  name?: string;
  address?: string;
}
