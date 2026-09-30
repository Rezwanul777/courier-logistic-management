import { prisma } from "../../lib/prisma";

const originReceive = async (shipmentId: number, adminId: number) => {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: {
        id: shipmentId,
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    if (shipment.status !== "PICKED_UP") {
      throw new Error("Shipment is not picked up");
    }

    await tx.shipment.update({
      where: {
        id: shipmentId,
      },

      data: {
        status: "AT_ORIGIN_HUB",
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId,

        previousStatus: shipment.status,

        newStatus: "AT_ORIGIN_HUB",

        actorId: adminId,

        reason: "Parcel received at origin hub",
      },
    });

    return {
      message: "Origin hub received shipment",
    };
  });
};

const dispatchTransfer = async (
  shipmentId: number,
  payload: any,
  adminId: number,
) => {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: {
        id: shipmentId,
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    if (shipment.status !== "AT_ORIGIN_HUB") {
      throw new Error("Shipment not ready for dispatch");
    }

    const transfer = await tx.hubTransfer.create({
      data: {
        shipmentId,

        fromHubId: payload.fromHubId,

        toHubId: payload.toHubId,

        createdById: adminId,
      },
    });

    await tx.shipment.update({
      where: {
        id: shipmentId,
      },

      data: {
        status: "IN_TRANSIT",
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId,

        previousStatus: shipment.status,

        newStatus: "IN_TRANSIT",

        actorId: adminId,

        reason: "Shipment dispatched",
      },
    });

    return transfer;
  });
};

const destinationReceive = async (shipmentId: number, adminId: number) => {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: {
        id: shipmentId,
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    if (shipment.status !== "IN_TRANSIT") {
      throw new Error("Invalid shipment status");
    }

    await tx.shipment.update({
      where: {
        id: shipmentId,
      },

      data: {
        status: "AT_DESTINATION_HUB",
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId,

        previousStatus: shipment.status,

        newStatus: "AT_DESTINATION_HUB",

        actorId: adminId,

        reason: "Received at destination hub",
      },
    });

    return {
      message: "Destination hub received",
    };
  });
};

export const HubTransferService = {
  originReceive,

  dispatchTransfer,

  destinationReceive,
};
