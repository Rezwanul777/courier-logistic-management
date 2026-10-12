
import type { z } from "zod";

import { ShipmentValidation } from "./shipment.validation";

export type IShipmentQuoteInput = z.infer<
  typeof ShipmentValidation.quoteShipment
>;

export type ICreateShipment = z.infer<
  typeof ShipmentValidation.createShipment
>;

export type IUpdateShipment = z.infer<
  typeof ShipmentValidation.updateShipment
>;

