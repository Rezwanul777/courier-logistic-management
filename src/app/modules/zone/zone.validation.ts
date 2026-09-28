import { z } from "zod";


const createZone = z.object({
  code: z
    .string()
    .min(2)
    .max(20),

  name: z
    .string()
    .min(3)
    .max(100),
});


const updateZone = z.object({
  name: z
    .string()
    .min(3)
    .max(100)
    .optional(),
});


export const ZoneValidation = {
  createZone,
  updateZone,
};
