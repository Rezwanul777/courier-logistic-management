import { Router } from "express";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { PaymentController } from "./payment.controller";

import { PaymentValidation } from "./payment.validation";

export const PaymentRoutes = Router();

PaymentRoutes.use(auth());

PaymentRoutes.post(
  "/checkout",

  validateRequest(PaymentValidation.createCheckout),

  PaymentController.createCheckout,
);

PaymentRoutes.get(
  "/shipment/:id",

  PaymentController.getPayment,
);
