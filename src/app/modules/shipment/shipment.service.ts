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

const getShipmentById = async (shipmentId: number, userId: number) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId: userId,
      deletedAt: null,
    },

    include: {
      originHub: {
        include: {
          zone: true,
        },
      },

      destinationHub: {
        include: {
          zone: true,
        },
      },

      trackingEvents: {
        orderBy: {
          occurredAt: "desc",
        },
      },
    },
  });

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  return shipment;
};

const updateShipment = async (
  shipmentId: number,
  userId: number,
  payload: any,
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId: userId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  if (shipment.status !== "DRAFT") {
    throw new Error("Only draft shipment can be updated");
  }

  return prisma.shipment.update({
    where: {
      id: shipmentId,
    },

    data: payload,
  });
};

const deleteShipment = async (shipmentId: number, userId: number) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId: userId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  if (shipment.status !== "DRAFT") {
    throw new Error("Only draft shipment can be deleted");
  }

  return prisma.shipment.update({
    where: {
      id: shipmentId,
    },

    data: {
      deletedAt: new Date(),
    },
  });
};



const getTrackingHistory = async (shipmentId: number, userId: number) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId: userId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  return prisma.trackingEvent.findMany({
    where: {
      shipmentId,
    },

    orderBy: {
      occurredAt: "asc",
    },
  });
};


// admin function to get all shipments with pagination and filtering

const getAllShipments = async (query: any) => {
  const page = Number(query.page) || 1;

  const limit = Number(query.limit) || 10;

  const skip = (page - 1) * limit;

  const where: any = {
    deletedAt: null,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.trackingCode = {
      contains: query.search,
      mode: "insensitive",
    };
  }

  const [items, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,

      skip,

      take: limit,

      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        originHub: true,

        destinationHub: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.shipment.count({
      where,
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
  getShipmentById,
  getTrackingHistory,
  updateShipment,
  deleteShipment,
  getAllShipments,
};
