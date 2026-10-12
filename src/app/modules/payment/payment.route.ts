
import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";
import { PaymentHistoryController } from "./payment-history.controller";

export const PaymentRoutes = Router();

// Only authenticated customers may access
// their shipment payment endpoints.
PaymentRoutes.use(auth("CUSTOMER"));

// Create or reuse a real Stripe Checkout session.
PaymentRoutes.post(
  "/checkout",
  validateRequest(PaymentValidation.createCheckout),
  PaymentController.createCheckout,
);

// Get payment status for an owned shipment.
PaymentRoutes.get(
  "/shipment/:id",
  PaymentController.getPayment,
);


// Customer's own paginated payment history
PaymentRoutes.get(
  "/my",
  PaymentHistoryController.getMyPayments,
);




