
import { Prisma } from "../../../generated/prisma/client";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

import { RateCardValidation } from "./rateCard.validation";

type CreateInput = z.infer<
  typeof RateCardValidation.createRateCard
>;

type UpdateInput = z.infer<
  typeof RateCardValidation.updateRateCard
>;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),

  originZoneId: z.coerce.number().int().positive().optional(),
  destinationZoneId: z.coerce.number().int().positive().optional(),

  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
});

const rateRelations = {
  originZone: {
    select: { id: true, code: true, name: true },
  },
  destinationZone: {
    select: { id: true, code: true, name: true },
  },
} as const;

function checkId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, "Invalid rate card ID.");
  }
}

async function serializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AppError(
        409,
        "Rate cards changed concurrently. Refresh and retry.",
      );
    }
    throw error;
  }
}

// Matching ranges have at least one common weight.
// The quote engine treats both endpoints as inclusive.
async function ensureNoOverlap(
  tx: Prisma.TransactionClient,
  input: {
    originZoneId: number;
    destinationZoneId: number;
    weightFrom: number;
    weightTo: number;
  },
  excludeId?: number,
) {
  const existing = await tx.rateCard.findFirst({
    where: {
      deletedAt: null,
      isActive: true,

      originZoneId: input.originZoneId,
      destinationZoneId: input.destinationZoneId,

      weightFrom: { lte: input.weightTo },
      weightTo: { gte: input.weightFrom },

      ...(excludeId !== undefined
        ? { id: { not: excludeId } }
        : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      409,
      `Active rate card #${existing.id} overlaps this route and weight range.`,
    );
  }
}

// ---------------------------------------------
// Create
// ---------------------------------------------

const createRateCard = async (payload: CreateInput) => {
  const uniqueZoneIds = [
    ...new Set([
      payload.originZoneId,
      payload.destinationZoneId,
    ]),
  ];

  return serializable(async (tx) => {
    const zoneCount = await tx.zone.count({
      where: {
        id: { in: uniqueZoneIds },
        deletedAt: null,
      },
    });

    if (zoneCount !== uniqueZoneIds.length) {
      throw new AppError(
        422,
        "One or more selected zones are unavailable.",
      );
    }

    if (payload.isActive) {
      await ensureNoOverlap(tx, payload);
    }

    return tx.rateCard.create({
      data: {
        originZoneId: payload.originZoneId,
        destinationZoneId: payload.destinationZoneId,
        weightFrom: payload.weightFrom,
        weightTo: payload.weightTo,
        baseAmountMinor: payload.baseAmountMinor,
        currency: payload.currency,
        isActive: payload.isActive,
        version: 1,
      },
      include: rateRelations,
    });
  });
};

// ---------------------------------------------
// Read
// ---------------------------------------------

const getRateCards = async (query: unknown) => {
  const parsed = querySchema.safeParse(query);

  if (!parsed.success) {
    throw new AppError(400, "Invalid rate card filters.");
  }

  const {
    page,
    limit,
    originZoneId,
    destinationZoneId,
    status,
  } = parsed.data;

  const where: Prisma.RateCardWhereInput = {
    deletedAt: null,

    ...(originZoneId !== undefined
      ? { originZoneId }
      : {}),

    ...(destinationZoneId !== undefined
      ? { destinationZoneId }
      : {}),

    ...(status === "ACTIVE"
      ? { isActive: true }
      : status === "INACTIVE"
        ? { isActive: false }
        : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.rateCard.findMany({
      where,
      include: rateRelations,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.rateCard.count({ where }),
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

// ---------------------------------------------
// Update price or status
// ---------------------------------------------

const updateRateCard = async (
  id: number,
  payload: UpdateInput,
) => {
  checkId(id);

  return serializable(async (tx) => {
    const current = await tx.rateCard.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!current) {
      throw new AppError(404, "Rate card not found.");
    }

    const nextActive =
      payload.isActive ?? current.isActive;

    const nextAmount =
      payload.baseAmountMinor ??
      current.baseAmountMinor;

    // Activating a card must never make two
    // active price bands match the same shipment.
    if (nextActive) {
      await ensureNoOverlap(
        tx,
        {
          originZoneId: current.originZoneId,
          destinationZoneId: current.destinationZoneId,
          weightFrom: current.weightFrom,
          weightTo: current.weightTo,
        },
        id,
      );
    }

    const amountChanged =
      nextAmount !== current.baseAmountMinor;

    const updated = await tx.rateCard.updateMany({
      where: {
        id,
        deletedAt: null,
        version: current.version,
      },
      data: {
        baseAmountMinor: nextAmount,
        isActive: nextActive,

        ...(amountChanged
          ? { version: { increment: 1 } }
          : {}),
      },
    });

    if (updated.count !== 1) {
      throw new AppError(
        409,
        "Rate card was modified. Refresh and retry.",
      );
    }

    return tx.rateCard.findUniqueOrThrow({
      where: { id },
      include: rateRelations,
    });
  });
};

// ---------------------------------------------
// Soft archive
// ---------------------------------------------

const deleteRateCard = async (id: number) => {
  checkId(id);

  const updated = await prisma.rateCard.updateMany({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  if (updated.count !== 1) {
    throw new AppError(
      404,
      "Rate card not found or already archived.",
    );
  }

  return {
    id,
    archived: true,
  };
};

export const RateCardService = {
  createRateCard,
  getRateCards,
  updateRateCard,
  deleteRateCard,
};
