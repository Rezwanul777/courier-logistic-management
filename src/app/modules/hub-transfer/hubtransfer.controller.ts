
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";
import { HubTransferService } from "./hub-transfer.service";

function getAdminId(
  userId: number | undefined,
): number {
  if (!userId) {
    throw new AppError(
      401,
      "Authentication required.",
    );
  }

  return userId;
}

// ---------------------------------------------
// POST /:id/origin-receive
// ---------------------------------------------

const originReceive = catchAsync(
  async (req, res) => {
    const adminId = getAdminId(req.user?.userId);

    const result =
      await HubTransferService.originReceive(
        Number(req.params.id),
        adminId,
      );

    res.status(200).json({
      success: true,
      message: "Shipment received at origin hub.",
      data: result,
    });
  },
);

// ---------------------------------------------
// POST /:id/dispatch
// ---------------------------------------------

const dispatchTransfer = catchAsync(
  async (req, res) => {
    const adminId = getAdminId(req.user?.userId);

    const result =
      await HubTransferService.dispatchTransfer(
        Number(req.params.id),
        req.body,
        adminId,
      );

    res.status(201).json({
      success: true,
      message: "Shipment dispatched successfully.",
      data: result,
    });
  },
);

// ---------------------------------------------
// POST /:id/destination-receive
// ---------------------------------------------

const destinationReceive = catchAsync(
  async (req, res) => {
    const adminId = getAdminId(req.user?.userId);

    const result =
      await HubTransferService.destinationReceive(
        Number(req.params.id),
        adminId,
      );

    res.status(200).json({
      success: true,
      message: "Shipment received at destination hub.",
      data: result,
    });
  },
);

export const HubTransferController = {
  originReceive,
  dispatchTransfer,
  destinationReceive,
};
