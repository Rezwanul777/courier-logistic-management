
import type { Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";

import { PaymentHistoryService } from "./payment-history.service";

// ------------------------------------------
// Validate search, sorting, and pagination
// ------------------------------------------

const paymentHistoryQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10),

  search: z.string()
    .trim()
    .max(100)
    .default(""),

  status: z.enum([
    "ALL",
    "PAID",
    "AWAITING_PAYMENT",
    "CHECKOUT_PENDING",
    "FAILED",
    "REFUND_PENDING",
    "REFUNDED",
  ]).default("ALL"),

  sort: z.enum([
    "newest",
    "oldest",
  ]).default("newest"),
});

// ------------------------------------------
// GET /api/v1/payments/my
// ------------------------------------------

const getMyPayments = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    const query =
      paymentHistoryQuerySchema.parse(
        req.query,
      );

    const result =
      await PaymentHistoryService.getMyPayments(
        userId,
        query,
      );

    res.status(200).json({
      success: true,
      message:
        "Customer payment history retrieved successfully.",
      data: result,
    });
  },
);

export const PaymentHistoryController = {
  getMyPayments,
};
