import { prisma } from "../../lib/prisma";
import { ICreateShipment } from "./shipment.interface";

const createShipment = async (userId: number, payload: ICreateShipment) => {
  const hubs = await prisma.hub.findMany({
    where: {
      id: {
        in: [payload.originHubId, payload.destinationHubId],
      },
      deletedAt: null,
    },
  });

  if (hubs.length !== 2) {
    throw new Error("Invalid hub");
  }

  const trackingCode = `TRK-${Date.now()}`;

  const shipment = await prisma.$transaction(async (tx) => {
    const result = await tx.shipment.create({
      data: {
        trackingCode,

        customerId: userId,

        originHubId: payload.originHubId,

        destinationHubId: payload.destinationHubId,

        description: payload.description,

        weight: payload.weight,

        pickupAddress: payload.pickupAddress,

        recipient: payload.recipient,

        quotedAmountMinor: payload.quotedAmountMinor,

        currency: payload.currency,
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId: result.id,

        newStatus: "DRAFT",

        actorId: userId,
      },
    });

    return result;
  });

  return shipment;
};

const getMyShipments = async (userId: number, query: any) => {
  const page = Number(query.page) || 1;

  const limit = Number(query.limit) || 10;

  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where: {
        customerId: userId,
        deletedAt: null,
      },

      skip,

      take: limit,

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.shipment.count({
      where: {
        customerId: userId,
        deletedAt: null,
      },
    }),
  ]);

  return {
    items,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const ShipmentService = {
  createShipment,

  getMyShipments,
};
