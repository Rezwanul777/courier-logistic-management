import { Router } from "express";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { TaskController } from "./task.controller";

import { TaskValidation } from "./task.validation";

export const AdminTaskRoutes = Router();

AdminTaskRoutes.use(auth("ADMIN"));

AdminTaskRoutes.post(
  "/assign-pickup",

  TaskController.assignPickup,
);

export const TaskRoutes = Router();

TaskRoutes.use(auth("COURIER"));

TaskRoutes.get(
  "/me/tasks",

  TaskController.getMyTasks,
);

TaskRoutes.post(
  "/:id/accept",

  TaskController.acceptTask,
);

TaskRoutes.post(
  "/:id/pickup",

  validateRequest(TaskValidation.pickupComplete),

  TaskController.completePickup,
);
