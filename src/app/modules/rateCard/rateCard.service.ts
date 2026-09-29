import { prisma } from "../../lib/prisma";

import { ICreateRateCard, IUpdateRateCard } from "./rateCard.interface";

const createRateCard = async (payload: ICreateRateCard) => {
  const zones = await prisma.zone.findMany({
    where: {
      id: {
        in: [payload.originZoneId, payload.destinationZoneId],
      },

      deletedAt: null,
    },
  });

  if (zones.length !== 2) {
    throw new Error("Invalid zone selected");
  }

  return prisma.rateCard.create({
    data: {
      ...payload,

      version: 1,
    },

    include: {
      originZone: true,

      destinationZone: true,
    },
  });
};

const getRateCards = async (query: any) => {
  const page = Number(query.page) || 1;

  const limit = Number(query.limit) || 10;

  const skip = (page - 1) * limit;

  const where: any = {
    deletedAt: null,
  };

  if (query.originZoneId) {
    where.originZoneId = Number(query.originZoneId);
  }

  if (query.destinationZoneId) {
    where.destinationZoneId = Number(query.destinationZoneId);
  }

  const [items, total] = await prisma.$transaction([
    prisma.rateCard.findMany({
      where,

      skip,

      take: limit,

      include: {
        originZone: true,

        destinationZone: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.rateCard.count({
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

const updateRateCard = async (id: number, payload: IUpdateRateCard) => {
  return prisma.rateCard.update({
    where: {
      id,
    },

    data: payload,
  });
};

const deleteRateCard = async (id: number) => {
  return prisma.rateCard.update({
    where: {
      id,
    },

    data: {
      deletedAt: new Date(),
    },
  });
};

export const RateCardService = {
  createRateCard,

  getRateCards,

  updateRateCard,

  deleteRateCard,
};
