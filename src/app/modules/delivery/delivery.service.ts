import { prisma } from "../../lib/prisma";

const assignDelivery = async (
  adminId: number,

  shipmentId: number,

  courierId: number,
) => {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: {
        id: shipmentId,
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    if (shipment.status !== "AT_DESTINATION_HUB") {
      throw new Error("Shipment is not ready for delivery");
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
      throw new Error("Courier not found");
    }

    const task = await tx.courierTask.create({
      data: {
        shipmentId,

        courierId,

        assignedById: adminId,

        type: "DELIVERY",

        status: "ASSIGNED",
      },
    });

    await tx.shipment.update({
      where: {
        id: shipmentId,
      },

      data: {
        status: "OUT_FOR_DELIVERY",
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId,

        previousStatus: shipment.status,

        newStatus: "OUT_FOR_DELIVERY",

        actorId: adminId,

        reason: "Delivery courier assigned",
      },
    });

    return task;
  });
};

const startDelivery = async (
  taskId: number,

  courierId: number,
) => {
  const task = await prisma.courierTask.findFirst({
    where: {
      id: taskId,

      courierId,

      type: "DELIVERY",
    },
  });

  if (!task) {
    throw new Error("Delivery task not found");
  }

  if (task.status !== "ASSIGNED") {
    throw new Error("Task already started");
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

const completeDelivery = async (
  taskId: number,

  courierId: number,

  payload: any,
) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.courierTask.findFirst({
      where: {
        id: taskId,

        courierId,

        type: "DELIVERY",
      },
    });

    if (!task) {
      throw new Error("Delivery task not found");
    }

    if (task.status !== "ACCEPTED") {
      throw new Error("Start delivery first");
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

        proof: payload.proof,
      },
    });

    await tx.shipment.update({
      where: {
        id: shipment.id,
      },

      data: {
        status: "DELIVERED",
      },
    });

    await tx.trackingEvent.create({
      data: {
        shipmentId: shipment.id,

        previousStatus: shipment.status,

        newStatus: "DELIVERED",

        actorId: courierId,

        reason: `Delivered to ${payload.recipientName}`,
      },
    });

    return {
      message: "Shipment delivered successfully",
    };
  });
};

export const DeliveryService = {
  assignDelivery,

  startDelivery,

  completeDelivery,
};
