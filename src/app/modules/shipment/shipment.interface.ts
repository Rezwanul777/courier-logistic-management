export interface ICreateShipment {
  originHubId: number;

  destinationHubId: number;

  description?: string;

  weight: number;

  pickupAddress: any;

  recipient: any;

  quotedAmountMinor: number;

  currency: string;
}
