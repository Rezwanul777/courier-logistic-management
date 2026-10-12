
import type { Request, Response } from "express";

import { catchAsync } from "../../utils/catchAsync";
import { AdminOverviewService } from "./admin-overview.service";

const getOverview = catchAsync(
  async (_req: Request, res: Response) => {
    const data = await AdminOverviewService.getOverview();

    res.status(200).json({
      success: true,
      message: "Admin overview retrieved successfully",
      data,
    });
  },
);

export const AdminOverviewController = {
  getOverview,
};
