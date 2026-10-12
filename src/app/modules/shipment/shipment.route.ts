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


ShipmentRoutes.use(auth("CUSTOMER"));


ShipmentRoutes.post(
  "/",
  validateRequest(ShipmentValidation.createShipment),
  ShipmentController.createShipment,
);

ShipmentRoutes.get("/my", ShipmentController.getMyShipments);
ShipmentRoutes.post(
  "/quote",
  validateRequest(ShipmentValidation.quoteShipment),
  ShipmentController.quoteShipment,
);

ShipmentRoutes.get("/:id", ShipmentController.getShipmentById);

ShipmentRoutes.patch(
  "/:id",
  validateRequest(ShipmentValidation.updateShipment),
  ShipmentController.updateShipment,
);

ShipmentRoutes.delete("/:id", ShipmentController.deleteShipment);

ShipmentRoutes.get("/:id/tracking", ShipmentController.getTrackingHistory);

export const AdminShipmentRoutes = Router();

AdminShipmentRoutes.use(auth("ADMIN"));

AdminShipmentRoutes.get("/", ShipmentController.getAllShipments);
ShipmentRoutes.get(
  "/:id/tracking", ShipmentController.getShipmentTracking,);

  AdminShipmentRoutes.get(
  "/",
  ShipmentController.getAllShipments,
);


AdminShipmentRoutes.get(
  "/:id",
  ShipmentController.getAdminShipmentById,
);

