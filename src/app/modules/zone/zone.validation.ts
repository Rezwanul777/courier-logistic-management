
import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens.");

const nameSchema = z.string().trim().min(3).max(100);

const createZone = z.strictObject({
  code: codeSchema,
  name: nameSchema,
});

const updateZone = z.strictObject({
  name: nameSchema,
});

export const ZoneValidation = {
  createZone,
  updateZone,
};
