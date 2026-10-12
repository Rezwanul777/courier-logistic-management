
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

interface DispatchPayload {
  fromHubId: number;
  toHubId: number;
}

function validateId(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, "Invalid shipment ID.");
  }
}

// ---------------------------------------------
// Receive parcel at origin hub
// PICKED_UP -> AT_ORIGIN_HUB
// ---------------------------------------------

const originReceive = async (
  shipmentId: number,
  adminId: number,
) => {
  validateId(shipmentId);

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
      },

      select: {
        id: true,
        status: true,
        originHubId: true,
      },
    });

    if (!shipment) {
      throw new AppError(
        404,
        "Shipment not found.",
      );
    }

    if (shipment.status !== "PICKED_UP") {
      throw new AppError(
        409,
        "Shipment must be picked up before origin hub receiving.",
      );
    }

    const result = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        deletedAt: null,
        status: "PICKED_UP",
      },

      data: {
        status: "AT_ORIGIN_HUB",
      },
    });

    if (result.count !== 1) {
      throw new AppError(
        409,
        "Shipment status changed. Please refresh.",
      );
    }

    await tx.trackingEvent.create({
      data: {
        shipmentId,
        previousStatus: "PICKED_UP",
        newStatus: "AT_ORIGIN_HUB",
        actorId: adminId,
        reason: "Parcel received at origin hub",
      },
    });

    return {
      shipmentId,
      status: "AT_ORIGIN_HUB",
    };
  });
};

// ---------------------------------------------
// Dispatch from origin to destination
// AT_ORIGIN_HUB -> IN_TRANSIT
// ---------------------------------------------

const dispatchTransfer = async (
  shipmentId: number,
  payload: DispatchPayload,
  adminId: number,
) => {
  validateId(shipmentId);

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
      },

      select: {
        id: true,
        status: true,
        originHubId: true,
        destinationHubId: true,
      },
    });

    if (!shipment) {
      throw new AppError(
        404,
        "Shipment not found.",
      );
    }

    if (shipment.status !== "AT_ORIGIN_HUB") {
      throw new AppError(
        409,
        "Shipment must be at the origin hub before dispatch.",
      );
    }

    // Never trust arbitrary hub IDs sent by
    // the frontend.
    if (
      payload.fromHubId !== shipment.originHubId ||
      payload.toHubId !== shipment.destinationHubId
    ) {
      throw new AppError(
        422,
        "Transfer hubs do not match the shipment route.",
      );
    }

    if (payload.fromHubId === payload.toHubId) {
      throw new AppError(
        422,
        "Origin and destination must be different hubs.",
      );
    }

    // Conditional status transition.
    const updated = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        deletedAt: null,
        status: "AT_ORIGIN_HUB",
      },

      data: {
        status: "IN_TRANSIT",
      },
    });

    if (updated.count !== 1) {
      throw new AppError(
        409,
        "Shipment was already dispatched or its status changed.",
      );
    }

    const transfer = await tx.hubTransfer.create({
      data: {
        shipmentId,
        fromHubId: shipment.originHubId,
        toHubId: shipment.destinationHubId,
        createdById: adminId,
        status: "DISPATCHED",
      },

      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId,
        previousStatus: "AT_ORIGIN_HUB",
        newStatus: "IN_TRANSIT",
        actorId: adminId,
        reason: "Parcel dispatched from origin hub",
      },
    });

    return {
      shipmentId,
      status: "IN_TRANSIT",
      transfer,
    };
  });
};

// ---------------------------------------------
// Receive parcel at destination hub
// IN_TRANSIT -> AT_DESTINATION_HUB
// ---------------------------------------------

const destinationReceive = async (
  shipmentId: number,
  adminId: number,
) => {
  validateId(shipmentId);

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findFirst({
      where: {
        id: shipmentId,
        deletedAt: null,
      },

      select: {
        id: true,
        status: true,
        originHubId: true,
        destinationHubId: true,
      },
    });

    if (!shipment) {
      throw new AppError(
        404,
        "Shipment not found.",
      );
    }

    if (shipment.status !== "IN_TRANSIT") {
      throw new AppError(
        409,
        "Shipment must be in transit before destination receiving.",
      );
    }

    const transfer = await tx.hubTransfer.findFirst({
      where: {
        shipmentId,
        fromHubId: shipment.originHubId,
        toHubId: shipment.destinationHubId,
        status: "DISPATCHED",
      },

      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],

      select: {
        id: true,
      },
    });

    if (!transfer) {
      throw new AppError(
        409,
        "No active dispatched transfer exists for this shipment.",
      );
    }

    const updated = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        deletedAt: null,
        status: "IN_TRANSIT",
      },

      data: {
        status: "AT_DESTINATION_HUB",
      },
    });

    if (updated.count !== 1) {
      throw new AppError(
        409,
        "Shipment status changed. Please refresh.",
      );
    }

    // Update the actual transfer record,
    // not only the shipment.
    const received = await tx.hubTransfer.updateMany({
      where: {
        id: transfer.id,
        shipmentId,
        status: "DISPATCHED",
      },

      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
      },
    });

    if (received.count !== 1) {
      throw new AppError(
        409,
        "Transfer was already received.",
      );
    }

    await tx.trackingEvent.create({
      data: {
        shipmentId,
        previousStatus: "IN_TRANSIT",
        newStatus: "AT_DESTINATION_HUB",
        actorId: adminId,
        reason: "Parcel received at destination hub",
      },
    });

    return {
      shipmentId,
      transferId: transfer.id,
      status: "AT_DESTINATION_HUB",
      transferStatus: "RECEIVED",
    };
  });
};

export const HubTransferService = {
  originReceive,
  dispatchTransfer,
  destinationReceive,
};
