
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

import type {
  IShipmentQuoteInput,
} from "./shipment.interface";

export async function calculateShipmentQuote(
  input: IShipmentQuoteInput,
) {
  const {
    originHubId,
    destinationHubId,
    weight,
  } = input;

  if (originHubId === destinationHubId) {
    throw new AppError(
      400,
      "Origin and destination hubs must be different.",
    );
  }

  // Validate both hubs and their zones.
  const hubs = await prisma.hub.findMany({
    where: {
      id: {
        in: [originHubId, destinationHubId],
      },
      deletedAt: null,
      zone: {
        deletedAt: null,
      },
    },
    select: {
      id: true,
      zoneId: true,
    },
  });

  const origin = hubs.find(
    (hub) => hub.id === originHubId,
  );

  const destination = hubs.find(
    (hub) => hub.id === destinationHubId,
  );

  if (!origin || !destination) {
    throw new AppError(
      422,
      "One or both selected hubs are unavailable.",
    );
  }

  // Rate cards are based on zones, not individual hubs.
  //
  // Both weight boundaries are inclusive.
  // Overlapping active rate cards are rejected.
  const matchingRates =
    await prisma.rateCard.findMany({
      where: {
        originZoneId: origin.zoneId,
        destinationZoneId: destination.zoneId,
        isActive: true,
        deletedAt: null,
        weightFrom: {
          lte: weight,
        },
        weightTo: {
          gte: weight,
        },
      },
      orderBy: {
        id: "desc",
      },
      take: 2,
    });

  if (matchingRates.length === 0) {
    throw new AppError(
      422,
      "No active shipping rate is available for this route and weight.",
    );
  }

  if (matchingRates.length > 1) {
    throw new AppError(
      409,
      "Multiple active rate cards match this shipment. Please contact operations.",
    );
  }

  const rate = matchingRates[0];

  if (!rate) {
    throw new AppError(
      422,
      "Shipping rate is unavailable.",
    );
  }

  const currency = rate.currency.toUpperCase();

  if (
    !Number.isSafeInteger(rate.baseAmountMinor) ||
    rate.baseAmountMinor <= 0 ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    throw new AppError(
      503,
      "The selected shipping rate is not configured correctly.",
    );
  }

  return {
    originHubId,
    destinationHubId,
    originZoneId: origin.zoneId,
    destinationZoneId: destination.zoneId,
    weight,
    rateCardId: rate.id,
    rateCardVersion: rate.version,
    amountMinor: rate.baseAmountMinor,
    currency,
  };
}
