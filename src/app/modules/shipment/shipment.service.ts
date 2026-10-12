import { prisma } from "../../lib/prisma";

import { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client";
import { ShipmentStatus } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";

import { randomBytes } from "node:crypto";



import type { ICreateShipment, IUpdateShipment } from "./shipment.interface";
import { calculateShipmentQuote } from "./shipment-pricing";




const adminShipmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),

  limit: z.coerce.number().int().min(1).max(50).default(10),

  search: z.string().trim().max(100).default(""),

  status: z.enum([
    "ALL",
    "DRAFT",
    "READY_FOR_PICKUP",
    "PICKUP_ASSIGNED",
    "PICKED_UP",
    "AT_ORIGIN_HUB",
    "IN_TRANSIT",
    "AT_DESTINATION_HUB",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "DELIVERY_FAILED",
    "RETURN_IN_TRANSIT",
    "RETURNED_TO_SENDER",
    "CANCEL_REQUESTED",
    "CANCELLED",
  ]).default("ALL"),

  tab: z.enum([
    "all",
    "ready",
    "transit",
    "delivered",
    "exceptions",
  ]).default("all"),

  dateRange: z.enum([
    "all",
    "7d",
    "30d",
    "90d",
  ]).default("30d"),

  sort: z.enum([
    "newest",
    "oldest",
  ]).default("newest"),
});

const getAllShipments = async (query: unknown) => {
  const filters = adminShipmentQuerySchema.parse(query);

  const {
    page,
    limit,
    search,
    status,
    tab,
    dateRange,
    sort,
  } = filters;

  const conditions: Prisma.ShipmentWhereInput[] = [
    {
      deletedAt: null,
    },
  ];

  // Search by tracking code
  if (search) {
    conditions.push({
      trackingCode: {
        contains: search,
        mode: "insensitive",
      },
    });
  }

  // "ALL" must NOT be passed to Prisma.
  if (status !== "ALL") {
    conditions.push({
      status,
    });
  }

  // Admin shipment tabs
  if (tab === "ready") {
    conditions.push({
      status: "READY_FOR_PICKUP",
    });
  }

  if (tab === "transit") {
    conditions.push({
      status: "IN_TRANSIT",
    });
  }

  if (tab === "delivered") {
    conditions.push({
      status: "DELIVERED",
    });
  }

  if (tab === "exceptions") {
    conditions.push({
      status: {
        in: [
          "DELIVERY_FAILED",
          "RETURN_IN_TRANSIT",
          "RETURNED_TO_SENDER",
          "CANCEL_REQUESTED",
        ],
      },
    });
  }

  // Date range
  if (dateRange !== "all") {
    const days = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    }[dateRange];

    const fromDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    );

    conditions.push({
      createdAt: {
        gte: fromDate,
      },
    });
  }

  const where: Prisma.ShipmentWhereInput = {
    AND: conditions,
  };

  const direction =
    sort === "oldest" ? "asc" : "desc";

  const [shipments, total] = await prisma.$transaction(
    [
      prisma.shipment.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy: [
          {
            createdAt: direction,
          },
          {
            id: direction,
          },
        ],

        select: {
          id: true,
          trackingCode: true,
          status: true,
          createdAt: true,

          customer: {
            select: {
              name: true,
              email: true,
            },
          },

          originHub: {
            select: {
              name: true,
            },
          },

          destinationHub: {
            select: {
              name: true,
            },
          },

          payment: {
            select: {
              status: true,
            },
          },
        },
      }),

      prisma.shipment.count({
        where,
      }),
    ],
    {
      isolationLevel: "RepeatableRead",
    },
  );

  return {
    items: shipments.map((shipment) => ({
      id: shipment.id,
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      createdAt: shipment.createdAt.toISOString(),

      customerName:
        shipment.customer.name ??
        shipment.customer.email,

      originHub: shipment.originHub.name,

      destinationHub:
        shipment.destinationHub.name,

      paymentStatus:
        shipment.payment?.status ?? null,
    })),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const createShipment = async (userId: number, payload: ICreateShipment) => {
  // Always calculate the price using current backend rates.
  const quote = await calculateShipmentQuote({
    originHubId: payload.originHubId,
    destinationHubId: payload.destinationHubId,
    weight: payload.weight,
  });

  // Prevent stale or altered quotes from being accepted.
  // The client confirmation is never used as the price.
  const confirmation = payload.quoteConfirmation;

  if (
    confirmation.rateCardId !== quote.rateCardId ||
    confirmation.amountMinor !== quote.amountMinor ||
    confirmation.currency !== quote.currency
  ) {
    throw new AppError(
      409,
      "The shipping quote has changed. Please request a new quote.",
    );
  }


const trackingCode =
  `CF-${new Date().getUTCFullYear()}-${randomBytes(12)
    .toString("hex")
    .toUpperCase()}`;


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

        // Trusted values computed on the server.
        quotedAmountMinor: quote.amountMinor,
        currency: quote.currency,
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

// const getMyShipments = async (userId: number, query: any) => {
//   const page = Number(query.page) || 1;

//   const limit = Number(query.limit) || 10;

//   const skip = (page - 1) * limit;

//   const [items, total] = await prisma.$transaction([
//     prisma.shipment.findMany({
//       where: {
//         customerId: userId,
//         deletedAt: null,
//       },

//       skip,

//       take: limit,

//       orderBy: {
//         createdAt: "desc",
//       },
//     }),

//     prisma.shipment.count({
//       where: {
//         customerId: userId,
//         deletedAt: null,
//       },
//     }),
//   ]);

//   return {
//     items,

//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     },
//   };
// };

const getMyShipments = async (userId: number, query: unknown) => {
  const parsed = adminShipmentQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new AppError(400, "Invalid shipment search or filter parameters.");
  }

  const { page, limit, search, status, dateRange } = parsed.data;

  const skip = (page - 1) * limit;

  // Every query is scoped to the authenticated customer.
  const where: Prisma.ShipmentWhereInput = {
    customerId: userId,
    deletedAt: null,
  };

  // Search tracking codes case-insensitively.
  if (search) {
    const escapedSearch = search.replace(/[\\%_]/g, "\\$&");

    where.trackingCode = {
      contains: escapedSearch,
      mode: "insensitive",
    };
  }

  // Treat the pseudo-status "ALL" as no status filter.
  const normalizedStatus = status === "ALL" ? undefined : status;

  if (normalizedStatus) {
    where.status = normalizedStatus;
  }

  // Apply a rolling date range based on creation time.
  const days = {
    all: 0,
    "7d": 7,
    "30d": 30,
    "90d": 90,
  }[dateRange];

  if (days > 0) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    const fromDate = new Date(Date.now() - days * millisecondsPerDay);

    where.createdAt = {
      gte: fromDate,
    };
  }

  // Both queries use the exact same filters.
  const [items, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
  payload: IUpdateShipment,
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId: userId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new AppError(404, "Shipment not found.");
  }

  if (shipment.status !== "DRAFT") {
    throw new AppError(409, "Only draft shipments can be updated.");
  }

  // Explicit allowlist: pricing and route fields
  // cannot be modified through this endpoint.
  const updates = {
    ...(payload.description !== undefined
      ? { description: payload.description }
      : {}),

    ...(payload.pickupAddress !== undefined
      ? { pickupAddress: payload.pickupAddress }
      : {}),

    ...(payload.recipient !== undefined
      ? { recipient: payload.recipient }
      : {}),
  };

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, "No valid shipment updates provided.");
  }

  return prisma.shipment.update({
    where: {
      id: shipmentId,
    },
    data: updates,
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

;

const getShipmentTracking = async (shipmentId: number, userId: number) => {
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

  const trackingEvents = await prisma.trackingEvent.findMany({
    where: {
      shipmentId,
    },

    orderBy: {
      occurredAt: "asc",
    },
  });

  return trackingEvents;
};


const getAdminShipmentById = async (
  shipmentId: number,
) => {
  if (
    !Number.isSafeInteger(shipmentId) ||
    shipmentId <= 0
  ) {
    throw new AppError(404, "Shipment not found.");
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null,
    },

    select: {
      id: true,
      trackingCode: true,
      status: true,
      description: true,
      weight: true,
      pickupAddress: true,
      recipient: true,
      quotedAmountMinor: true,
      currency: true,
      createdAt: true,

      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },

      originHub: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
        },
      },

      destinationHub: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
        },
      },

      payment: {
        select: {
          status: true,
          amountMinor: true,
          currency: true,
          provider: true,
          paidAt: true,
        },
      },

      trackingEvents: {
        orderBy: [
          { occurredAt: "desc" },
          { id: "desc" },
        ],

        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          reason: true,
          occurredAt: true,
        },
      },

      courierTasks: {
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],

        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          acceptedAt: true,
          completedAt: true,

          courier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!shipment) {
    throw new AppError(
      404,
      "Shipment not found.",
    );
  }

  return shipment;
};


export const ShipmentService = {
  createShipment,
  getMyShipments,
  getShipmentById,
  getTrackingHistory,
  updateShipment,
  deleteShipment,
  getAllShipments,
  getShipmentTracking,
  getAdminShipmentById,
};
