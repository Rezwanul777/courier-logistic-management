
import { z } from "zod";

const amount = z.number().int().positive();

const createRateCard = z
  .strictObject({
    originZoneId: z.number().int().positive(),
    destinationZoneId: z.number().int().positive(),

    weightFrom: z.number().finite().min(0),
    weightTo: z.number().finite().positive(),

    baseAmountMinor: amount,

    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),

    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (data) => data.weightTo > data.weightFrom,
    {
      path: ["weightTo"],
      message: "Maximum weight must exceed minimum weight.",
    },
  );

const updateRateCard = z
  .strictObject({
    baseAmountMinor: amount.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.baseAmountMinor !== undefined ||
      data.isActive !== undefined,
    { message: "Provide a rate or status to update." },
  );

export const RateCardValidation = {
  createRateCard,
  updateRateCard,
};

