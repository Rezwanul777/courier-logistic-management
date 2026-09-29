import { z } from "zod";

const createCheckout = z.object({
  shipmentId: z.number().int().positive(),
});

export const PaymentValidation = {
  createCheckout,
};
