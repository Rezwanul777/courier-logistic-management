
import { z } from "zod";

const createCourier = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must contain at least 3 characters.")
    .max(100),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(254),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .max(128),
});

const changeStatus = z.object({
  isActive: z.boolean(),
});

export const CourierValidation = {
  createCourier,
  changeStatus,
};
