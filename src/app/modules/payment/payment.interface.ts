export interface ICreateCheckout {

shipmentId:number;

}


export interface IWebhookPayload {
  rawBody: Buffer;
  signature: string;
}
