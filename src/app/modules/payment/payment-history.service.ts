
import type { Prisma } from "../../../generated/prisma/client";

import { prisma } from "../../lib/prisma";

// ------------------------------------------
// Payment history query types
// ------------------------------------------

export type PaymentHistoryStatus =
  | "ALL"
  | "PAID"
  | "AWAITING_PAYMENT"
  | "CHECKOUT_PENDING"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export interface PaymentHistoryQuery {
  page: number;
  limit: number;
  search: string;
  status: PaymentHistoryStatus;
  sort: "newest" | "oldest";
}

// ------------------------------------------
// Customer's own payment history
// ------------------------------------------

const getMyPayments = async (
  userId: number,
  query: PaymentHistoryQuery,
) => {
  const {
    page,
    limit,
    search,
    status,
    sort,
  } = query;

  const skip = (page - 1) * limit;

  // Every query is restricted to the
  // authenticated customer's shipments.
  const baseWhere: Prisma.ShipmentWhereInput = {
    customerId: userId,
    deletedAt: null,
  };

  const where: Prisma.ShipmentWhereInput = {
    ...baseWhere,

    ...(search
      ? {
          trackingCode: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  // Payment may be null for a new DRAFT shipment.
  // Those bookings must still appear in Payments.

  if (status === "AWAITING_PAYMENT") {
    where.status = "DRAFT";

    where.OR = [
      {
        payment: {
          is: null,
        },
      },
      {
        payment: {
          is: {
            status: "UNPAID",
          },
        },
      },
    ];
  } else if (status !== "ALL") {
    where.payment = {
      is: {
        status,
      },
    };
  }

  // Pending means an unpaid draft that can
  // still proceed through checkout.
  const pendingWhere: Prisma.ShipmentWhereInput = {
    ...baseWhere,
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
              in: [
                "UNPAID",
                "CHECKOUT_PENDING",
                "FAILED",
              ],
            },
          },
        },
      },
    ],
  };

  const direction =
    sort === "oldest" ? "asc" : "desc";

  // Use a single database snapshot for
  // consistent listing and summary counts.
  const [
    shipments,
    total,
    paidShipments,
    pendingShipments,
  ] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,

      select: {
        id: true,
        trackingCode: true,
        status: true,
        currency: true,
        quotedAmountMinor: true,
        createdAt: true,

        payment: {
          select: {
            id: true,
            status: true,
            amountMinor: true,
            currency: true,
            paidAt: true,
            provider: true,
          },
        },
      },

      orderBy: [
        { createdAt: direction },
        { id: direction },
      ],

      skip,
      take: limit,
    }),

    prisma.shipment.count({
      where,
    }),

    prisma.shipment.count({
      where: {
        ...baseWhere,

        payment: {
          is: {
            status: "PAID",
          },
        },
      },
    }),

    prisma.shipment.count({
      where: pendingWhere,
    }),
  ]);

  const items = shipments.map((shipment) => {
    const payment = shipment.payment;

    const paymentStatus =
      !payment || payment.status === "UNPAID"
        ? "AWAITING_PAYMENT"
        : payment.status;

    const canPay =
      shipment.status === "DRAFT" &&
      (
        !payment ||
        payment.status === "UNPAID" ||
        payment.status === "CHECKOUT_PENDING" ||
        payment.status === "FAILED"
      );

    return {
      shipmentId: shipment.id,
      trackingCode: shipment.trackingCode,
      shipmentStatus: shipment.status,

      paymentStatus,

      currency:
        payment?.currency ?? shipment.currency,

      amountMinor:
        payment?.amountMinor ??
        shipment.quotedAmountMinor,

      paymentProvider:
        payment?.provider ?? "STRIPE",

      paidAt:
        payment?.paidAt?.toISOString() ?? null,

      createdAt:
        shipment.createdAt.toISOString(),

      canPay,
    };
  });

  return {
    items,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },

    summary: {
      paidShipments,
      pendingShipments,
      paymentMethod: "Stripe",
    },
  };
};

export const PaymentHistoryService = {
  getMyPayments,
};
