
import type { Prisma } from "../../../generated/prisma/client";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parseCatalogQuery } from "../catalog/catalog.query";

import type {
  ICreateHub,
  IUpdateHub,
} from "./hub.interface";

function validateId(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, "Invalid hub ID.");
  }
}

const createHub = async (payload: ICreateHub) => {
  const code = payload.code.trim().toUpperCase();

  const [zone, existing] = await Promise.all([
    prisma.zone.findFirst({
      where: {
        id: payload.zoneId,
        deletedAt: null,
      },
      select: { id: true },
    }),

    prisma.hub.findUnique({
      where: { code },
      select: { id: true },
    }),
  ]);

  if (!zone) {
    throw new AppError(
      422,
      "Select an existing active zone.",
    );
  }

  if (existing) {
    throw new AppError(409, "Hub code already exists.");
  }

  return prisma.hub.create({
    data: {
      code,
      name: payload.name.trim(),
      address: payload.address.trim(),
      zoneId: zone.id,
    },
    include: { zone: true },
  });
};

// Existing public endpoint used by shipment forms.
const getActiveHubs = async () => {
  return prisma.hub.findMany({
    where: {
      deletedAt: null,
      zone: { deletedAt: null },
    },
    include: { zone: true },
    orderBy: { createdAt: "desc" },
  });
};

const getAdminHubs = async (query: unknown) => {
  const { page, limit, skip, search } =
    parseCatalogQuery(query);

  const where: Prisma.HubWhereInput = {
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
            {
              address: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.hub.findMany({
      where,
      include: { zone: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
    prisma.hub.count({ where }),
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

const updateHub = async (
  id: number,
  payload: IUpdateHub,
) => {
  validateId(id);

  const updated = await prisma.hub.updateMany({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      name: payload.name?.trim(),
      address: payload.address?.trim(),
    },
  });

  if (updated.count !== 1) {
    throw new AppError(404, "Hub not found.");
  }

  return prisma.hub.findUniqueOrThrow({
    where: { id },
    include: { zone: true },
  });
};

const deleteHub = async (id: number) => {
  validateId(id);

  return prisma.$transaction(async (tx) => {
    const hub = await tx.hub.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!hub) {
      throw new AppError(404, "Hub not found.");
    }

    // Preserve historical shipments and transfers.
    const [shipments, transfers] = await Promise.all([
      tx.shipment.count({
        where: {
          OR: [
            { originHubId: id },
            { destinationHubId: id },
          ],
        },
      }),

      tx.hubTransfer.count({
        where: {
          OR: [
            { fromHubId: id },
            { toHubId: id },
          ],
        },
      }),
    ]);

    if (shipments > 0 || transfers > 0) {
      throw new AppError(
        409,
        "Hub is referenced by shipments or transfers and cannot be archived.",
      );
    }

    const updated = await tx.hub.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (updated.count !== 1) {
      throw new AppError(409, "Hub has already changed.");
    }

    return { id, archived: true };
  });
};

export const HubService = {
  createHub,
  getActiveHubs,
  getAdminHubs,
  updateHub,
  deleteHub,
};
