
import { Request, Response } from "express";

import { catchAsync } from "../../utils/catchAsync";
import { CourierService } from "./courier.service";

// ---------------------------------------------
// POST /admin/couriers
// ---------------------------------------------

const createCourier = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CourierService.createCourier(
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Courier account created successfully.",
      data: result,
    });
  },
);

// ---------------------------------------------
// GET /admin/couriers
// ---------------------------------------------

const getCouriers = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await CourierService.getCouriers();

    res.status(200).json({
      success: true,
      message: "Couriers retrieved successfully.",
      data: result,
    });
  },
);

// ---------------------------------------------
// PATCH /admin/couriers/:id/status
// ---------------------------------------------

const changeStatus = catchAsync(
  async (req: Request, res: Response) => {
    const courierId = Number(req.params.id);

    const result = await CourierService.changeStatus(
      courierId,
      req.body.isActive,
    );

    res.status(200).json({
      success: true,
      message: result.isActive
        ? "Courier account activated successfully."
        : "Courier account deactivated successfully.",
      data: result,
    });
  },
);

export const CourierController = {
  createCourier,
  getCouriers,
  changeStatus,
};
