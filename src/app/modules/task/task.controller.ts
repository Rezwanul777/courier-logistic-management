import { Request, Response } from "express";

import { TaskService } from "./task.service";

const assignPickup = async (req: Request, res: Response) => {
  const result = await TaskService.assignPickup(
    req.user?.userId as number,

    req.body.shipmentId,

    req.body.courierId,
  );

  res.status(201).json({
    success: true,

    message: "Courier assigned",

    data: result,
  });
};

const getMyTasks = async (req: Request, res: Response) => {
  const result = await TaskService.getMyTasks(req.user?.userId as number);

  res.json({
    success: true,

    message: "Tasks retrieved",

    data: result,
  });
};

const acceptTask = async (req: Request, res: Response) => {
  const result = await TaskService.acceptTask(
    Number(req.params.id),

    req.user?.userId as number,
  );

  res.json({
    success: true,

    message: "Task accepted",

    data: result,
  });
};

const completePickup = async (req: Request, res: Response) => {
  const result = await TaskService.completePickup(
    Number(req.params.id),

    req.user?.userId as number,

    req.body.proof,
  );

  res.json({
    success: true,

    message: "Pickup completed",

    data: result,
  });
};

export const TaskController = {
  assignPickup,

  getMyTasks,

  acceptTask,

  completePickup,
};
