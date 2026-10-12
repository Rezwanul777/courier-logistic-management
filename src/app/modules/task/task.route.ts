
import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

import { TaskController } from "./task.controller";
import { TaskValidation } from "./task.validation";
import { TaskHistoryController } from "./task-history.controller";

// ---------------------------------------------
// Admin task routes
// /api/v1/admin/tasks
// ---------------------------------------------

export const AdminTaskRoutes = Router();

AdminTaskRoutes.use(auth("ADMIN"));

AdminTaskRoutes.post(
  "/assign-pickup",
  validateRequest(TaskValidation.assignPickup),
  TaskController.assignPickup,
);

// ---------------------------------------------
// Courier task routes
// /api/v1/tasks
// ---------------------------------------------

export const TaskRoutes = Router();

TaskRoutes.use(auth("COURIER"));

// Active tasks
TaskRoutes.get(
  "/me/tasks",
  TaskController.getMyTasks,
);

// Completed-task history
TaskRoutes.get(
  "/me/history",
  TaskHistoryController.getMyHistory,
);

// Individual task, including completed tasks
TaskRoutes.get(
  "/:id",
  TaskController.getMyTaskById,
);

// Accept pickup task
TaskRoutes.post(
  "/:id/accept",
  TaskController.acceptTask,
);

// Complete pickup
TaskRoutes.post(
  "/:id/pickup",
  validateRequest(TaskValidation.pickupComplete),
  TaskController.completePickup,
);
