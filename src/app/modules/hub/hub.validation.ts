
import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens.");

const nameSchema = z.string().trim().min(3).max(100);
const addressSchema = z.string().trim().min(5).max(255);

const createHub = z.strictObject({
  code: codeSchema,
  name: nameSchema,
  address: addressSchema,
  zoneId: z.number().int().positive(),
});

const updateHub = z.strictObject({
  name: nameSchema,
  address: addressSchema,
});

export const HubValidation = {
  createHub,
  updateHub,
};
