
import bcrypt from "bcryptjs";

import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

import type { ICreateCourier } from "./courier.interface";

// Fields safe to return to the Admin frontend.
const courierSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
} as const;

// ---------------------------------------------
// Create courier account
// ---------------------------------------------

const createCourier = async (
  payload: ICreateCourier,
) => {
  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      409,
      "An account with this email already exists.",
    );
  }

  const saltRounds =
    Number(config.bcrypt_salt_rounds) || 10;

  const passwordHash = await bcrypt.hash(
    payload.password,
    saltRounds,
  );

  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.COURIER,
      authProvider: "CREDENTIAL",
      emailVerified: true,
      isActive: true,
    },

    select: courierSelect,
  });
};

// ---------------------------------------------
// Get all non-deleted courier accounts
// ---------------------------------------------

const getCouriers = async () => {
  return prisma.user.findMany({
    where: {
      role: Role.COURIER,
      deletedAt: null,
    },

    select: courierSelect,

    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });
};

// ---------------------------------------------
// Activate or deactivate courier
// ---------------------------------------------

const changeStatus = async (
  id: number,
  isActive: boolean,
) => {
  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    throw new AppError(
      400,
      "Invalid courier ID.",
    );
  }

  const courier = await prisma.user.findFirst({
    where: {
      id,
      role: Role.COURIER,
      deletedAt: null,
    },

    select: courierSelect,
  });

  if (!courier) {
    throw new AppError(
      404,
      "Courier account not found.",
    );
  }

  // Repeated requests should not unnecessarily
  // update an account.
  if (courier.isActive === isActive) {
    return courier;
  }

  // When deactivating, the conditional update
  // also checks that the courier has no
  // outstanding assigned or accepted tasks.
  const updated = await prisma.user.updateMany({
    where: {
      id,
      role: Role.COURIER,
      deletedAt: null,
      isActive: !isActive,

      ...(!isActive
        ? {
            courierTasks: {
              none: {
                status: {
                  in: ["ASSIGNED", "ACCEPTED"],
                },
              },
            },
          }
        : {}),
    },

    data: {
      isActive,
    },
  });

  if (updated.count !== 1) {
    throw new AppError(
      409,
      "Courier status could not be changed. Complete outstanding tasks or refresh the directory.",
    );
  }

  const result = await prisma.user.findUnique({
    where: { id },
    select: courierSelect,
  });

  if (!result) {
    throw new AppError(
      404,
      "Courier account not found.",
    );
  }

  return result;
};

// ---------------------------------------------
// Public module interface
// ---------------------------------------------

export const CourierService = {
  createCourier,
  getCouriers,
  changeStatus,
};
