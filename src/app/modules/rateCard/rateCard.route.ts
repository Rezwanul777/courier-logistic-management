import { Router } from "express";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { RateCardController } from "./rateCard.controller";

import { RateCardValidation } from "./rateCard.validation";

export const RateCardRoutes = Router();

RateCardRoutes.use(auth("ADMIN"));

RateCardRoutes.post(
  "/",

  validateRequest(RateCardValidation.createRateCard),

  RateCardController.createRateCard,
);

RateCardRoutes.get(
  "/",

  RateCardController.getRateCards,
);

RateCardRoutes.patch(
  "/:id",

  validateRequest(RateCardValidation.updateRateCard),

  RateCardController.updateRateCard,
);

RateCardRoutes.delete(
  "/:id",

  RateCardController.deleteRateCard,
);
