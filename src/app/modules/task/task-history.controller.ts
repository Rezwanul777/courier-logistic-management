
import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";

import { TaskHistoryService } from "./task-history.service";

const getMyHistory = catchAsync(
  async (req: Request, res: Response) => {
    const courierId = req.user?.userId;

    if (!courierId) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    const result =
      await TaskHistoryService.getMyHistory(
        courierId,
        req.query,
      );

    res.status(200).json({
      success: true,
      message: "Courier task history retrieved successfully.",
      data: result,
    });
  },
);

export const TaskHistoryController = {
  getMyHistory,
};
