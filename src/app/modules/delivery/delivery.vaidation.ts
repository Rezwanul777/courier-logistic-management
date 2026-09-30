import { z } from "zod";

const assignDelivery = z.object({
  courierId: z.number().int().positive(),
});

const deliverShipment = z.object({
  recipientName: z.string().min(3).max(100),

  proof: z.string().min(3).max(500),
});

export const DeliveryValidation = {
  assignDelivery,

  deliverShipment,
};
