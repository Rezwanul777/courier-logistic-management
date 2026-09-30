import { Router } from "express";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { DeliveryController } from "./delivery.controller";
import { DeliveryValidation } from "./delivery.vaidation";


export const AdminDeliveryRoutes = Router();

AdminDeliveryRoutes.use(auth("ADMIN"));

AdminDeliveryRoutes.post(
  "/shipments/:id/assign-delivery",

  validateRequest(DeliveryValidation.assignDelivery),

  DeliveryController.assignDelivery,
);

export const DeliveryRoutes = Router();

DeliveryRoutes.use(auth("COURIER"));

DeliveryRoutes.post(
  "/tasks/:id/start-delivery",

  DeliveryController.startDelivery,
);

DeliveryRoutes.post(
  "/tasks/:id/deliver",

  validateRequest(DeliveryValidation.deliverShipment),

  DeliveryController.completeDelivery,
);
