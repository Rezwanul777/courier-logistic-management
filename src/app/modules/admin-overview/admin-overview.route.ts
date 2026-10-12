
import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { AdminOverviewController } from "./admin-overview.controller";

export const AdminOverviewRoutes = Router();

AdminOverviewRoutes.use(auth("ADMIN"));

AdminOverviewRoutes.get(
  "/",
  AdminOverviewController.getOverview,
);
