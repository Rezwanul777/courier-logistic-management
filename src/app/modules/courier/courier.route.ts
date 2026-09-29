import { Router } from "express";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { CourierController } from "./courier.controller";

import { CourierValidation } from "./courier.validation";

export const CourierRoutes = Router();

CourierRoutes.use(auth("ADMIN"));

CourierRoutes.post(
  "/",

  validateRequest(CourierValidation.createCourier),

  CourierController.createCourier,
);

CourierRoutes.get(
  "/",

  CourierController.getCouriers,
);

CourierRoutes.patch(
  "/:id/status",

  validateRequest(CourierValidation.changeStatus),

  CourierController.changeStatus,
);
