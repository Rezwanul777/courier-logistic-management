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

const getShipmentById = async (req: Request, res: Response) => {
  const result = await ShipmentService.getShipmentById(
    Number(req.params.id),

    req.user?.userId as number,
  );

  res.json({
    success: true,

    message: "Shipment retrieved",

    data: result,
  });
};

const updateShipment = async (req: Request, res: Response) => {
  const result = await ShipmentService.updateShipment(
    Number(req.params.id),

    req.user?.userId as number,

    req.body,
  );

  res.json({
    success: true,

    message: "Shipment updated",

    data: result,
  });
};

const deleteShipment = async (req: Request, res: Response) => {
  const result = await ShipmentService.deleteShipment(
    Number(req.params.id),

    req.user?.userId as number,
  );

  res.json({
    success: true,

    message: "Shipment deleted",

    data: result,
  });
};

const getTrackingHistory = async (req: Request, res: Response) => {
  const result = await ShipmentService.getTrackingHistory(
    Number(req.params.id),

    req.user?.userId as number,
  );

  res.json({
    success: true,

    message: "Tracking retrieved",

    data: result,
  });
};

// get all shipments for admin

const getAllShipments = async (req: Request, res: Response) => {
  const result = await ShipmentService.getAllShipments(req.query);

  res.json({
    success: true,

    message: "Shipments retrieved",

    data: result,
  });
};


export const ShipmentController = {
  createShipment,

  getMyShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
  getTrackingHistory,
  getAllShipments,
};
