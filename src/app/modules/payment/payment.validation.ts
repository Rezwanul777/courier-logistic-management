
import { z } from "zod";

const createCheckout = z.strictObject({
  shipmentId: z
    .number()
    .int()
    .positive("Shipment ID must be positive.")
    .max(Number.MAX_SAFE_INTEGER),
});

export const PaymentValidation = {
  createCheckout,
};

