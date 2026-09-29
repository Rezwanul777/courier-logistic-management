import { Router } from "express";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { ShipmentController } from "./shipment.controller";

import { ShipmentValidation } from "./shipment.validation";

export const ShipmentRoutes = Router();

ShipmentRoutes.use(auth());

ShipmentRoutes.post(
  "/",

  validateRequest(ShipmentValidation.createShipment),

  ShipmentController.createShipment,
);

ShipmentRoutes.get(
  "/my",

  ShipmentController.getMyShipments,
);
