import {z} from "zod";


const createShipment=z.object({

originHubId:
z.number()
.int()
.positive(),


destinationHubId:
z.number()
.int()
.positive(),



description:
z.string()
.max(500)
.optional(),



weight:
z.number()
.positive(),



pickupAddress:
z.object({}),



recipient:
z.object({}),



quotedAmountMinor:
z.number()
.int()
.positive(),



currency:
z.string()
.min(3)
.max(10),

});



export const ShipmentValidation={

createShipment

};
