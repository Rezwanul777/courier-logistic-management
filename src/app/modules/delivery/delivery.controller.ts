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


const startDelivery = async (req: Request, res: Response) => {
  const result = await DeliveryService.startDelivery(
    Number(req.params.id),

    req.user?.userId as number,
  );

  res.json({
    success: true,

    message: "Delivery started",

    data: result,
  });
};

const completeDelivery = async (req: Request, res: Response) => {
  const result = await DeliveryService.completeDelivery(
    Number(req.params.id),

    req.user?.userId as number,

    req.body,
  );

  res.json({
    success: true,

    message: "Shipment delivered",

    data: result,
  });
};

export const DeliveryController = {
  assignDelivery,

  startDelivery,

  completeDelivery,
};
