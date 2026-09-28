import { z } from "zod";


const createHub = z.object({

  code: z
    .string()
    .min(2)
    .max(20),

  name: z
    .string()
    .min(3)
    .max(100),

  address: z
    .string()
    .min(5)
    .max(255),

  zoneId: z
    .number()
    .int()
    .positive(),

});


const updateHub = z.object({

  name: z
    .string()
    .min(3)
    .max(100)
    .optional(),

  address: z
    .string()
    .min(5)
    .max(255)
    .optional(),

});


export const HubValidation = {
  createHub,
  updateHub,
};
