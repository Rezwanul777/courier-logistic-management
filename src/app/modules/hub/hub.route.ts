import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

import { HubController } from "./hub.controller";
import { HubValidation } from "./hub.validation";

export const HubRoutes = Router();
export const AdminHubRoutes = Router();

// Public/Auth user

HubRoutes.get("/", HubController.getActiveHubs);


// Admin

AdminHubRoutes.use(auth("ADMIN"));

AdminHubRoutes.post(
  "/",

  validateRequest(HubValidation.createHub),

  HubController.createHub,
);

AdminHubRoutes.get(
  "/",

  HubController.getAdminHubs,
);

AdminHubRoutes.patch(
  "/:id",

  validateRequest(HubValidation.updateHub),

  HubController.updateHub,
);

AdminHubRoutes.delete(
  "/:id",

  HubController.deleteHub,
);




