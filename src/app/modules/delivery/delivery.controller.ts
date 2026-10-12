import { Request, Response } from "express";

import { DeliveryService } from "./delivery.service";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";

const assignDelivery = catchAsync(
  async (req, res) => {
    const adminId = req.user?.userId;

    if (!adminId) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    const result =
      await DeliveryService.assignDelivery(
        adminId,
        Number(req.params.id),
        req.body.courierId,
      );

    res.status(201).json({
      success: true,
      message:
        "Delivery courier assigned successfully.",
      data: result,
    });
  },
);


const startDelivery = catchAsync(
  async (req, res) => {
    const result = await DeliveryService.startDelivery(
      Number(req.params.id),
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      message: "Delivery task accepted successfully.",
      data: result,
    });
  },
);

const completeDelivery = catchAsync(
  async (req, res) => {
    const result =
      await DeliveryService.completeDelivery(
        Number(req.params.id),
        req.user!.userId,
        req.body,
      );

    res.status(200).json({
      success: true,
      message: "Shipment delivered successfully.",
      data: result,
    });
  },
);

export const DeliveryController = {
  assignDelivery,

  startDelivery,

  completeDelivery,
};
