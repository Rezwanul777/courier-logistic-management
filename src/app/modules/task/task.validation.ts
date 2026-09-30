import { z } from "zod";

const assignPickup = z.object({
  shipmentId: z.number().int().positive(),

  courierId: z.number().int().positive(),
});

const pickupComplete = z.object({
  proof: z.string().min(3).max(500),
});

export const TaskValidation = {
  assignPickup,

  pickupComplete,
};
