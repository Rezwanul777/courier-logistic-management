import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { PaymentController } from "./payment.controller";

export const PaymentRoutes = Router();

PaymentRoutes.use(auth());

PaymentRoutes.post("/checkout", PaymentController.createCheckout);

PaymentRoutes.get("/shipment/:id", PaymentController.getPayment);
