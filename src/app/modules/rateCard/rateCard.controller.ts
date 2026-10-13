
import { catchAsync } from "../../utils/catchAsync";
import { RateCardService } from "./rateCard.service";

const createRateCard = catchAsync(async (req, res) => {
  const data = await RateCardService.createRateCard(
    req.body,
  );

  res.status(201).json({
    success: true,
    message: "Rate card created successfully.",
    data,
  });
});

const getRateCards = catchAsync(async (req, res) => {
  const data = await RateCardService.getRateCards(
    req.query,
  );

  res.status(200).json({
    success: true,
    message: "Rate cards retrieved successfully.",
    data,
  });
});

const updateRateCard = catchAsync(async (req, res) => {
  const data = await RateCardService.updateRateCard(
    Number(req.params.id),
    req.body,
  );

  res.status(200).json({
    success: true,
    message: "Rate card updated successfully.",
    data,
  });
});

const deleteRateCard = catchAsync(async (req, res) => {
  const data = await RateCardService.deleteRateCard(
    Number(req.params.id),
  );

  res.status(200).json({
    success: true,
    message: "Rate card archived successfully.",
    data,
  });
});

export const RateCardController = {
  createRateCard,
  getRateCards,
  updateRateCard,
  deleteRateCard,
};
