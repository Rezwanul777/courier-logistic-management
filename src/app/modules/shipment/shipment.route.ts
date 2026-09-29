// import { Router } from "express";

// import { auth } from "../../middleware/checkAuth";

// import { validateRequest } from "../../middleware/validateRequest";

// import { ShipmentController } from "./shipment.controller";

// import { ShipmentValidation } from "./shipment.validation";

// export const ShipmentRoutes = Router();

// ShipmentRoutes.use(auth());

// ShipmentRoutes.post(
//   "/",

//   validateRequest(ShipmentValidation.createShipment),

//   ShipmentController.createShipment,
// );

// ShipmentRoutes.get(
//   "/my",

//   ShipmentController.getMyShipments,
// );

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

ShipmentRoutes.get("/my", ShipmentController.getMyShipments);

ShipmentRoutes.get("/:id", ShipmentController.getShipmentById);

ShipmentRoutes.patch("/:id", ShipmentController.updateShipment);

ShipmentRoutes.delete("/:id", ShipmentController.deleteShipment);

ShipmentRoutes.get("/:id/tracking", ShipmentController.getTrackingHistory);

export const AdminShipmentRoutes = Router();

AdminShipmentRoutes.use(auth("ADMIN"));

AdminShipmentRoutes.get("/", ShipmentController.getAllShipments);
