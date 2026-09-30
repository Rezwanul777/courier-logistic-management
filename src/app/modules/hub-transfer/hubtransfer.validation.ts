import { z } from "zod";

const createTransfer = z.object({
  fromHubId: z.number().int().positive(),

  toHubId: z.number().int().positive(),
});

export const HubTransferValidation = {
  createTransfer,
};
