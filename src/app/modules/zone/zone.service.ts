
import type { Prisma } from "../../../generated/prisma/client";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parseCatalogQuery } from "../catalog/catalog.query";

import type {
  ICreateZone,
  IUpdateZone,
} from "./zone.interface";

function validateId(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, "Invalid zone ID.");
  }
}

const createZone = async (payload: ICreateZone) => {
  const code = payload.code.trim().toUpperCase();
  const name = payload.name.trim();

  const existing = await prisma.zone.findUnique({
    where: { code },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(409, "Zone code already exists.");
  }

  return prisma.zone.create({
    data: { code, name },
  });
};

const getZones = async () => {
  return prisma.zone.findMany({
    where: { deletedAt: null },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
};

const getAdminZones = async (query: unknown) => {
  const { page, limit, skip, search } =
    parseCatalogQuery(query);

  const where: Prisma.ZoneWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              code: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.zone.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.zone.count({ where }),
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

const updateZone = async (
  id: number,
  payload: IUpdateZone,
) => {
  validateId(id);

  const updated = await prisma.zone.updateMany({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      name: payload.name?.trim(),
    },
  });

  if (updated.count !== 1) {
    throw new AppError(404, "Zone not found.");
  }

  return prisma.zone.findUniqueOrThrow({
    where: { id },
  });
};

const deleteZone = async (id: number) => {
  validateId(id);

  return prisma.$transaction(async (tx) => {
    const zone = await tx.zone.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!zone) {
      throw new AppError(404, "Zone not found.");
    }

    // Protect all historical and active references.
    const [hubs, rateCards] = await Promise.all([
      tx.hub.count({ where: { zoneId: id } }),
      tx.rateCard.count({
        where: {
          OR: [
            { originZoneId: id },
            { destinationZoneId: id },
          ],
        },
      }),
    ]);

    if (hubs > 0 || rateCards > 0) {
      throw new AppError(
        409,
        "Zone is referenced by hubs or rate cards and cannot be archived.",
      );
    }

    const updated = await tx.zone.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (updated.count !== 1) {
      throw new AppError(409, "Zone has already changed.");
    }

    return { id, archived: true };
  });
};

export const ZoneService = {
  createZone,
  getZones,
  getAdminZones,
  updateZone,
  deleteZone,
};
