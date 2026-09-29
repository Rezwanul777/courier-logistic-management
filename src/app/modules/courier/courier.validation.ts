import { z } from "zod";

const createCourier = z.object({
  name: z.string().min(3),

  email: z.string().email(),

  password: z.string().min(8),
});

const changeStatus = z.object({
  isActive: z.boolean(),
});

export const CourierValidation = {
  createCourier,

  changeStatus,
};
