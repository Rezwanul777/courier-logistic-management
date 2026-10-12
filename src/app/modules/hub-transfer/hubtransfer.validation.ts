
import { z } from "zod";

const createTransfer = z
  .strictObject({
    fromHubId: z.number().int().positive(),
    toHubId: z.number().int().positive(),
  })
  .refine(
    (data) => data.fromHubId !== data.toHubId,
    {
      message: "Origin and destination hubs must be different.",
      path: ["toHubId"],
    },
  );

export const HubTransferValidation = {
  createTransfer,
};

