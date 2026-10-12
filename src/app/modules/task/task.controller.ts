import { Request, Response } from "express";

import { TaskService } from "./task.service";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";


// ---------------------------------------------
// ADMIN: assign pickup courier
// ---------------------------------------------

const assignPickup = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TaskService.assignPickup(
      req.user!.userId,
      req.body.shipmentId,
      req.body.courierId,
    );

    res.status(201).json({
      success: true,
      message: "Pickup courier assigned successfully.",
      data: result,
    });
  },
);



// ---------------------------------------------
// COURIER: task list
// ---------------------------------------------

const getMyTasks = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TaskService.getMyTasks(
      req.user!.userId,
      req.query,
    );

    res.status(200).json({
      success: true,
      message: "Courier tasks retrieved successfully.",
      data: result,
    });
  },
);

// ---------------------------------------------
// COURIER: task details
// ---------------------------------------------

const getMyTaskById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TaskService.getMyTaskById(
      Number(req.params.id),
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      message: "Courier task retrieved successfully.",
      data: result,
    });
  },
);


// ---------------------------------------------
// COURIER: accept pickup
// ---------------------------------------------

const acceptTask = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TaskService.acceptTask(
      Number(req.params.id),
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      message: "Pickup task accepted successfully.",
      data: result,
    });
  },
);

// ---------------------------------------------
// COURIER: complete pickup
// ---------------------------------------------

const completePickup = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TaskService.completePickup(
      Number(req.params.id),
      req.user!.userId,
      req.body.proof,
    );

    res.status(200).json({
      success: true,
      message: "Parcel pickup confirmed successfully.",
      data: result,
    });
  },
);

export const TaskController = {
  assignPickup,

  getMyTasks,
  getMyTaskById,

  acceptTask,

  completePickup,
  
};
