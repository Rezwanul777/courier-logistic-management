import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";


const assignDelivery = async (
  adminId: number,
  shipmentId: number,
  courierId: number,
) => {
  if (
    !Number.isSafeInteger(shipmentId) ||
    shipmentId <= 0 ||
    !Number.isSafeInteger(courierId) ||
    courierId <= 0
  ) {
    throw new AppError(
      400,
      "Invalid shipment or courier ID.",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      // 1. Verify the shipment and payment.
      const shipment = await tx.shipment.findFirst({
        where: {
          id: shipmentId,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          originHubId: true,
          destinationHubId: true,
          payment: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!shipment) {
        throw new AppError(
          404,
          "Shipment not found.",
        );
      }

      if (
        shipment.status !== "AT_DESTINATION_HUB"
      ) {
        throw new AppError(
          409,
          "Shipment is not ready for delivery assignment.",
        );
      }

      if (shipment.payment?.status !== "PAID") {
        throw new AppError(
          409,
          "Verified payment is required.",
        );
      }

      // 2. Verify completed hub transfer.
      const receivedTransfer =
        await tx.hubTransfer.findFirst({
          where: {
            shipmentId,
            fromHubId: shipment.originHubId,
            toHubId: shipment.destinationHubId,
            status: "RECEIVED",
          },
          select: {
            id: true,
          },
        });

      if (!receivedTransfer) {
        throw new AppError(
          409,
          "Destination hub receipt has not been verified.",
        );
      }

      // 3. Verify selected courier.
      const courier = await tx.user.findFirst({
        where: {
          id: courierId,
          role: "COURIER",
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!courier) {
        throw new AppError(
          422,
          "Selected courier is not an active courier.",
        );
      }

      // 4. Atomically claim this shipment.
      // A second competing assignment will fail.
      const updated = await tx.shipment.updateMany({
        where: {
          id: shipmentId,
          deletedAt: null,
          status: "AT_DESTINATION_HUB",
          payment: {
            is: {
              status: "PAID",
            },
          },
        },
        data: {
          status: "OUT_FOR_DELIVERY",
        },
      });

      if (updated.count !== 1) {
        throw new AppError(
          409,
          "Shipment was already assigned or its status changed.",
        );
      }

      // 5. Create the delivery task.
      const task = await tx.courierTask.create({
        data: {
          shipmentId,
          courierId,
          assignedById: adminId,
          type: "DELIVERY",
          status: "ASSIGNED",
        },
        select: {
          id: true,
          shipmentId: true,
          courierId: true,
          type: true,
          status: true,
          createdAt: true,
        },
      });

      // 6. Add shipment tracking event.
      await tx.trackingEvent.create({
        data: {
          shipmentId,
          previousStatus: "AT_DESTINATION_HUB",
          newStatus: "OUT_FOR_DELIVERY",
          actorId: adminId,
          reason: "Delivery courier assigned",
        },
      });

      return task;
    },
    {
      timeout: 10_000,
    },
  );
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
