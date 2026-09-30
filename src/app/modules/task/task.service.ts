import { prisma } from "../../lib/prisma";

const assignPickup = async (
  adminId: number,
  shipmentId: number,
  courierId: number,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: {
        id: shipmentId,
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    if (shipment.status !== "READY_FOR_PICKUP") {
      throw new Error("Shipment is not ready for pickup");
    }

    const courier = await tx.user.findFirst({
      where: {
        id: courierId,

        role: "COURIER",

        isActive: true,

        deletedAt: null,
      },
    });

    if (!courier) {
      throw new Error("Invalid courier");
    }

    const task = await tx.courierTask.create({
      data: {
        shipmentId,

        courierId,

        assignedById: adminId,

        type: "PICKUP",

        status: "ASSIGNED",
      },
    });

    await tx.shipment.update({
      where: {
        id: shipmentId,
      },

      data: {
        status: "PICKUP_ASSIGNED",
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId,

        previousStatus: shipment.status,

        newStatus: "PICKUP_ASSIGNED",

        actorId: adminId,

        reason: "Courier assigned for pickup",
      },
    });

    return task;
  });

  return result;
};

const getMyTasks = async (courierId: number) => {
  return prisma.courierTask.findMany({
    where: {
      courierId,

      status: {
        not: "COMPLETED",
      },
    },

    include: {
      shipment: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

const acceptTask = async (taskId: number, courierId: number) => {
  const task = await prisma.courierTask.findFirst({
    where: {
      id: taskId,

      courierId,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.status !== "ASSIGNED") {
    throw new Error("Task already accepted");
  }

  return prisma.courierTask.update({
    where: {
      id: taskId,
    },

    data: {
      status: "ACCEPTED",

      acceptedAt: new Date(),
    },
  });
};

const completePickup = async (
  taskId: number,
  courierId: number,
  proof: string,
) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.courierTask.findFirst({
      where: {
        id: taskId,

        courierId,
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "ACCEPTED") {
      throw new Error("Accept task first");
    }

    const shipment = await tx.shipment.findUnique({
      where: {
        id: task.shipmentId,
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    await tx.courierTask.update({
      where: {
        id: taskId,
      },

      data: {
        status: "COMPLETED",

        completedAt: new Date(),

        proof,
      },
    });

    await tx.shipment.update({
      where: {
        id: shipment.id,
      },

      data: {
        status: "PICKED_UP",
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId: shipment.id,

        previousStatus: shipment.status,

        newStatus: "PICKED_UP",

        actorId: courierId,

        reason: "Courier picked up parcel",
      },
    });

    return {
      message: "Pickup completed",
    };
  });
};

export const TaskService = {
  assignPickup,

  getMyTasks,

  acceptTask,

  completePickup,
};
