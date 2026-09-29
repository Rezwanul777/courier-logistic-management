import { Request, Response } from "express";

import { PaymentService } from "./payment.service";

const createCheckout = async (req: Request, res: Response) => {
  const result = await PaymentService.createCheckout(
    req.user?.userId as number,

    req.body,
  );

  res.json({
    success: true,

    message: "Checkout created",

    data: result,
  });
};

const getPayment = async (req: Request, res: Response) => {
  const result = await PaymentService.getPayment(
    req.user?.userId as number,

    Number(req.params.id),
  );

  res.json({
    success: true,

    message: "Payment retrieved",

    data: result,
  });
};

export const PaymentController = {
  createCheckout,
  getPayment,
};
