import { Router } from "express";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";
import { HubTransferController } from "./hubtransfer.controller";
import { HubTransferValidation } from "./hubtransfer.validation";



export const HubTransferRoutes = Router();

HubTransferRoutes.use(auth("ADMIN"));

// Receive parcel at origin hub

HubTransferRoutes.post(
  "/:id/origin-receive",

  HubTransferController.originReceive,
);

// Dispatch shipment

HubTransferRoutes.post(
  "/:id/dispatch",

  validateRequest(HubTransferValidation.createTransfer),

  HubTransferController.dispatchTransfer,
);

// Receive at destination hub

HubTransferRoutes.post(
  "/:id/destination-receive",

  HubTransferController.destinationReceive,
);
