export interface IAssignDelivery {
  shipmentId: number;

  courierId: number;
}

export interface IDeliverShipment {
  recipientName: string;

  proof: string;
}
