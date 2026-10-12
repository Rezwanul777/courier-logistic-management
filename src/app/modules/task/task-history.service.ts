
import { z } from "zod";

import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// ---------------------------------------------
// Query validation
// ---------------------------------------------

const historyQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(1),

  type: z
    .enum(["ALL", "PICKUP", "DELIVERY", "RETURN"])
    .default("ALL"),

  search: z.string().trim().max(100).default(""),

  sort: z
    .enum(["newest", "oldest"])
    .default("newest"),
});

const PAGE_SIZE = 10;

// ---------------------------------------------
// Get completed courier tasks
// ---------------------------------------------

const getMyHistory = async (
  courierId: number,
  query: unknown,
) => {
  const parsed = historyQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new AppError(
      400,
      "Invalid task history filters.",
    );
  }

  const { page, type, search, sort } = parsed.data;

  // Always restrict records to the authenticated
  // courier and completed tasks.
  const baseWhere: Prisma.CourierTaskWhereInput = {
    courierId,
    status: "COMPLETED",
  };

  const where: Prisma.CourierTaskWhereInput = {
    ...baseWhere,

    ...(type !== "ALL"
      ? { type }
      : {}),

    ...(search
      ? {
          shipment: {
            is: {
              trackingCode: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          },
        }
      : {}),
  };

  const direction =
    sort === "oldest" ? "asc" : "desc";

  const [items, total, completed, pickup, delivery] =
    await prisma.$transaction([
      // Current filtered page
      prisma.courierTask.findMany({
        where,

        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          completedAt: true,

          shipment: {
            select: {
              trackingCode: true,
            },
          },
        },

        orderBy: [
          { completedAt: direction },
          { id: direction },
        ],

        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),

      // Filtered result count
      prisma.courierTask.count({
        where,
      }),

      // All-time performance counts
      prisma.courierTask.count({
        where: baseWhere,
      }),

      prisma.courierTask.count({
        where: {
          ...baseWhere,
          type: "PICKUP",
        },
      }),

      prisma.courierTask.count({
        where: {
          ...baseWhere,
          type: "DELIVERY",
        },
      }),
    ]);

  return {
    items,

    pagination: {
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },

    summary: {
      completed,
      pickup,
      delivery,
    },
  };
};

export const TaskHistoryService = {
  getMyHistory,
};
