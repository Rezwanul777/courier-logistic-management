import { Request, Response } from "express";
import { ShipmentService } from "./shipment.service";

const createShipment = async (req: Request, res: Response) => {
  const userId = req.user?.userId as number;

  const result = await ShipmentService.createShipment(userId, req.body);

  res.status(201).json({
    success: true,

    message: "Shipment created successfully",

    data: result,
  });
};

const getMyShipments = async (req: Request, res: Response) => {
  const result = await ShipmentService.getMyShipments(
    req.user?.userId as number,

    req.query,
  );

  res.json({
    success: true,

    message: "Shipments retrieved",

    data: result,
  });
};

export const ShipmentController = {
  createShipment,

  getMyShipments,
};
