import { Request, Response } from "express";

import { DeliveryService } from "./delivery.service";

const assignDelivery = async (req: Request, res: Response) => {
  const result = await DeliveryService.assignDelivery(
    req.user?.userId as number,

    Number(req.params.id),

    req.body.courierId,
  );

  res.status(201).json({
    success: true,

    message: "Delivery courier assigned",

    data: result,
  });
};

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
