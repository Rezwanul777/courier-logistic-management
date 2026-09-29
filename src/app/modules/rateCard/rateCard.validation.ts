import {z} from "zod";





const createRateCard = z.object({

  originZoneId:z.number()
    .int()
    .positive(),


  destinationZoneId:z.number()
    .int()
    .positive(),


  weightFrom:z
    .number()
    .min(0),


  weightTo:z
    .number()
    .positive(),


  baseAmountMinor:z
    .number()
    .int()
    .positive(),


  currency:z
    .string()
    .min(3)
    .max(10),

});


const updateRateCard=z.object({

  baseAmountMinor:z
    .number()
    .int()
    .positive()
    .optional(),


  isActive:z
    .boolean()
    .optional(),

});


export const RateCardValidation={
  createRateCard,
  updateRateCard,
};



