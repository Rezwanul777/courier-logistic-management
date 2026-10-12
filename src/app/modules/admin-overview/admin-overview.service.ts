
import { prisma } from "../../lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

const getOverview = async () => {
  const now = new Date();

  // Seven UTC calendar days, including today.
  const firstDayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 6,
  );

  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(firstDayMs + index * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);

    return {
      start,
      end,
      date: start.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(start),
    };
  });

  const [
    allShipments,
    readyForPickup,
    inTransit,
    delivered,
    unassignedPickups,
    deliveryFailures,
    paymentPending,
    recent,
    dailyCounts,
  ] = await Promise.all([
    // All non-deleted shipments
    prisma.shipment.count({
      where: {
        deletedAt: null,
      },
    }),

    prisma.shipment.count({
      where: {
        deletedAt: null,
        status: "READY_FOR_PICKUP",
      },
    }),

    prisma.shipment.count({
      where: {
        deletedAt: null,
        status: "IN_TRANSIT",
      },
    }),

    prisma.shipment.count({
      where: {
        deletedAt: null,
        status: "DELIVERED",
      },
    }),

    // Ready shipments without an active pickup task
    prisma.shipment.count({
      where: {
        deletedAt: null,
        status: "READY_FOR_PICKUP",
        courierTasks: {
          none: {
            type: "PICKUP",
            status: {
              in: ["ASSIGNED", "ACCEPTED"],
            },
          },
        },
      },
    }),

    prisma.shipment.count({
      where: {
        deletedAt: null,
        status: "DELIVERY_FAILED",
      },
    }),

    // Drafts that have not been paid
    prisma.shipment.count({
      where: {
        deletedAt: null,
        status: "DRAFT",
        OR: [
          {
            payment: {
              is: null,
            },
          },
          {
            payment: {
              is: {
                status: {
                  not: "PAID",
                },
              },
            },
          },
        ],
      },
    }),

    // Latest five real shipments
    prisma.shipment.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: 5,
      select: {
        id: true,
        trackingCode: true,
        status: true,
        createdAt: true,
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

    // Count bookings per day without loading all
    // historical shipments into application memory.
    Promise.all(
      days.map((day) =>
        prisma.shipment.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: day.start,
              lt: day.end,
            },
          },
        }),
      ),
    ),
  ]);

  return {
    summary: {
      allShipments,
      readyForPickup,
      inTransit,
      delivered,
    },

    attention: {
      unassignedPickups,
      deliveryFailures,
      paymentPending,
    },

    volume: days.map((day, index) => ({
      date: day.date,
      label: day.label,
      count: dailyCounts[index],
    })),

    recentShipments: recent.map((shipment) => ({
      id: shipment.id,
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      createdAt: shipment.createdAt,
      originHub: shipment.originHub.name,
      destinationHub: shipment.destinationHub.name,
      paymentStatus: shipment.payment?.status ?? null,
    })),
  };
};

export const AdminOverviewService = {
  getOverview,
};
