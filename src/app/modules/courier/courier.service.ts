import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma";

import config from "../../config";
import { Role } from "../../../generated/prisma/enums";





const createCourier = async (payload: any) => {
  const existing = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existing) {
    throw new Error("Email already exists");
  }

  const passwordHash = await bcrypt.hash(
    payload.password,

    Number(config.bcrypt_salt_rounds),
  );

  const courier = await prisma.user.create({
    data: {
      name: payload.name,

      email: payload.email,

      passwordHash,

      role: Role.COURIER,

      emailVerified: true,

      isActive: true,

      authProvider: "CREDENTIAL",
    },
  });

  return courier;
};

const getCouriers = async () => {
  return prisma.user.findMany({
    where: {
      role: "COURIER",
      deletedAt: null,
    },

    select: {
      id: true,

      name: true,

      email: true,

      isActive: true,
    },
  });
};

const changeStatus = async (
  id: number,

  isActive: boolean,
) => {
  return prisma.user.update({
    where: {
      id,
    },

    data: {
      isActive,
    },
  });
};

export const CourierService = {
  createCourier,

  getCouriers,

  changeStatus,
};
