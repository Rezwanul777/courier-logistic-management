import { Request, Response } from "express";

import { RateCardService } from "./rateCard.service";

const createRateCard = async (req: Request, res: Response) => {
  const result = await RateCardService.createRateCard(req.body);

  res.status(201).json({
    success: true,

    message: "Rate card created",

    data: result,
  });
};

const getRateCards = async (req: Request, res: Response) => {
  const result = await RateCardService.getRateCards(req.query);

  res.json({
    success: true,

    message: "Rate cards retrieved",

    data: result,
  });
};

const updateRateCard = async (req: Request, res: Response) => {
  const result = await RateCardService.updateRateCard(
    Number(req.params.id),

    req.body,
  );

  res.json({
    success: true,

    message: "Rate card updated",

    data: result,
  });
};

const deleteRateCard = async (req: Request, res: Response) => {
  const result = await RateCardService.deleteRateCard(Number(req.params.id));

  res.json({
    success: true,

    message: "Rate card deleted",

    data: result,
  });
};

export const RateCardController = {
  createRateCard,

  getRateCards,

  updateRateCard,

  deleteRateCard,
};
