export interface ICreateRateCard {

 originZoneId:number;

 destinationZoneId:number;

 weightFrom:number;

 weightTo:number;

 baseAmountMinor:number;

 currency:string;

}



export interface IUpdateRateCard {

 baseAmountMinor?:number;

 isActive?:boolean;

}
