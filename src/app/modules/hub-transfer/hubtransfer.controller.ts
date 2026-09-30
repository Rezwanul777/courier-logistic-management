import { Request, Response } from "express";
import { HubTransferService } from "./hub-transfer.service";


const originReceive = async (req: Request, res: Response) => {
  const result = await HubTransferService.originReceive(
    Number(req.params.id),

    req.user?.userId as number,
  );

  res.json({
    success: true,

    message: "Shipment received at origin hub",

    data: result,
  });
};

const dispatchTransfer = async (req: Request, res: Response) => {
  const result = await HubTransferService.dispatchTransfer(
    Number(req.params.id),

    req.body,

    req.user?.userId as number,
  );

  res.status(201).json({
    success: true,

    message: "Shipment transfer created",

    data: result,
  });
};

const destinationReceive = async (req: Request, res: Response) => {
  const result = await HubTransferService.destinationReceive(
    Number(req.params.id),

    req.user?.userId as number,
  );

  res.json({
    success: true,

    message: "Shipment received at destination hub",

    data: result,
  });
};

export const HubTransferController = {
  originReceive,

  dispatchTransfer,

  destinationReceive,
};
