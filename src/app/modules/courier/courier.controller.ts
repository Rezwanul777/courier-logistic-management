import { Request, Response } from "express";

import { CourierService } from "./courier.service";

const createCourier = async (req: Request, res: Response) => {
  const result = await CourierService.createCourier(req.body);

  res.status(201).json({
    success: true,

    message: "Courier created successfully",

    data: result,
  });
};

const getCouriers = async (req: Request, res: Response) => {
  const result = await CourierService.getCouriers();

  res.json({
    success: true,

    message: "Couriers retrieved",

    data: result,
  });
};

const changeStatus = async (req: Request, res: Response) => {
  const result = await CourierService.changeStatus(
    Number(req.params.id),

    req.body.isActive,
  );

  res.json({
    success: true,

    message: "Courier status updated",

    data: result,
  });
};

export const CourierController = {
  createCourier,

  getCouriers,

  changeStatus,
};
