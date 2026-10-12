import { Request, Response } from "express";

import { PaymentService } from "./payment.service";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";

const createCheckout = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    const result =
      await PaymentService.createCheckout(
        userId,
        req.body,
      );

    res.status(200).json({
      success: true,
      message: "Checkout session created.",
      data: result,
    });
  },
);

// ---------------------------------------------
// Get shipment payment
// ---------------------------------------------

const getPayment = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const rawId = req.params.id;

    if (!userId) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    if (
      typeof rawId !== "string" ||
      !/^[1-9]\d*$/.test(rawId)
    ) {
      throw new AppError(
        400,
        "Invalid shipment ID.",
      );
    }

    const shipmentId = Number(rawId);

    if (!Number.isSafeInteger(shipmentId)) {
      throw new AppError(
        400,
        "Invalid shipment ID.",
      );
    }

    const payment =
      await PaymentService.getPayment(
        userId,
        shipmentId,
      );

    res.status(200).json({
      success: true,
      message: "Payment retrieved.",
      data: payment,
    });
  },
);

// ---------------------------------------------
// Handle Stripe webhook
// ---------------------------------------------

const webhook = catchAsync(
  async (req: Request, res: Response) => {
    const signature =
      req.headers["stripe-signature"];

    if (typeof signature !== "string") {
      throw new AppError(
        400,
        "Missing Stripe webhook signature.",
      );
    }

    // Stripe signature verification requires
    // the original raw request body.
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(
        400,
        "Invalid Stripe webhook payload.",
      );
    }

    const result =
      await PaymentService.handleWebhook(
        req.body,
        signature,
      );

    res.status(200).json({
      received: true,
      data: result,
    });
  },
);

export const PaymentController = {
  createCheckout,
  getPayment,
  webhook,
};
