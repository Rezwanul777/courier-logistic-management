
import { z } from "zod";

const hubId = z.number().int().positive();

const weight = z
  .number()
  .finite()
  .positive("Weight must be greater than zero.");

const name = z.string().trim().min(2).max(100);

const phone = z
  .string()
  .trim()
  .min(7)
  .max(25)
  .regex(/^\+?[0-9()\s-]+$/)
  .refine(
    (value) => (value.match(/\d/g) ?? []).length >= 7,
    "Phone number must contain at least 7 digits.",
  );

const address = z.string().trim().min(8).max(300);
const city = z.string().trim().min(2).max(80);

const pickupAddress = z.strictObject({
  senderName: name,
  senderPhone: phone,
  address,
  city,
});

const recipient = z.strictObject({
  name,
  phone,
  address,
  city,
});

const routeFields = {
  originHubId: hubId,
  destinationHubId: hubId,
  weight,
};

const differentHubs = (values: {
  originHubId: number;
  destinationHubId: number;
}) => values.originHubId !== values.destinationHubId;

// Request a quote without providing a price.
const quoteShipment = z
  .strictObject(routeFields)
  .refine(differentHubs, {
    path: ["destinationHubId"],
    message: "Select two different hubs.",
  });

// The customer confirms what the server previously quoted.
// These fields will be compared against a fresh server quote,
// not used directly as the shipment price.
const quoteConfirmation = z.strictObject({
  rateCardId: z.number().int().positive(),
  amountMinor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

// Create a shipment using a server-calculated price.
const createShipment = z
  .strictObject({
    ...routeFields,
    description: z.string().trim().max(500).optional(),
    pickupAddress,
    recipient,
    quoteConfirmation,
  })
  .refine(differentHubs, {
    path: ["destinationHubId"],
    message: "Select two different hubs.",
  });

// Draft changes cannot modify payment amounts,
// currencies, hubs, weights, or pricing.
const updateShipment = z
  .strictObject({
    description: z.string().trim().max(500).optional(),
    pickupAddress: pickupAddress.optional(),
    recipient: recipient.optional(),
  })
  .refine(
    (values) => Object.values(values).some(
      (value) => value !== undefined,
    ),
    "Provide at least one field to update.",
  );

export const ShipmentValidation = {
  quoteShipment,
  createShipment,
  updateShipment,
};
