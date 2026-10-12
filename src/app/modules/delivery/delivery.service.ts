import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IDeliverShipment } from "./delivery.interface";


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
  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    throw new AppError(404, "Delivery task not found.");
  }

  const updated = await prisma.courierTask.updateMany({
    where: {
      id: taskId,
      courierId,
      type: "DELIVERY",
      status: "ASSIGNED",
      shipment: {
        is: {
          status: "OUT_FOR_DELIVERY",
          deletedAt: null,
        },
      },
    },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  if (updated.count !== 1) {
    throw new AppError(
      409,
      "Delivery task is unavailable or already accepted.",
    );
  }

  return prisma.courierTask.findFirst({
    where: {
      id: taskId,
      courierId,
      type: "DELIVERY",
    },
    select: {
      id: true,
      shipmentId: true,
      type: true,
      status: true,
      acceptedAt: true,
    },
  });
};

// Confirm the parcel was delivered
const completeDelivery = async (
  taskId: number,
  courierId: number,
  payload: IDeliverShipment,
) => {
  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    throw new AppError(404, "Delivery task not found.");
  }

  const recipientName = payload.recipientName.trim();
  const proof = payload.proof.trim();

  if (recipientName.length < 3 || recipientName.length > 100) {
    throw new AppError(
      400,
      "Recipient name must contain 3 to 100 characters.",
    );
  }

  if (proof.length < 3 || proof.length > 500) {
    throw new AppError(
      400,
      "Delivery proof must contain 3 to 500 characters.",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const task = await tx.courierTask.findFirst({
        where: {
          id: taskId,
          courierId,
          type: "DELIVERY",
        },
        select: {
          id: true,
          shipmentId: true,
          status: true,
        },
      });

      if (!task) {
        throw new AppError(
          404,
          "Delivery task not found.",
        );
      }

      if (task.status !== "ACCEPTED") {
        throw new AppError(
          409,
          "Accept the delivery task before confirming delivery.",
        );
      }

      const completedAt = new Date();

      // Update the task only if it remains eligible.
      const taskUpdated = await tx.courierTask.updateMany({
        where: {
          id: taskId,
          courierId,
          type: "DELIVERY",
          status: "ACCEPTED",
          shipment: {
            is: {
              status: "OUT_FOR_DELIVERY",
              deletedAt: null,
            },
          },
        },
        data: {
          status: "COMPLETED",
          completedAt,
          proof,
        },
      });

      if (taskUpdated.count !== 1) {
        throw new AppError(
          409,
          "Delivery task has already been completed or changed.",
        );
      }

      // Safely move the shipment to DELIVERED.
      const shipmentUpdated =
        await tx.shipment.updateMany({
          where: {
            id: task.shipmentId,
            deletedAt: null,
            status: "OUT_FOR_DELIVERY",
          },
          data: {
            status: "DELIVERED",
          },
        });

      if (shipmentUpdated.count !== 1) {
        throw new AppError(
          409,
          "Shipment status changed. Delivery could not be confirmed.",
        );
      }

      // Record the shipment tracking event.
      await tx.trackingEvent.create({
        data: {
          shipmentId: task.shipmentId,
          previousStatus: "OUT_FOR_DELIVERY",
          newStatus: "DELIVERED",
          actorId: courierId,
          reason: `Delivered to ${recipientName}`,
        },
      });

      return {
        taskId: task.id,
        shipmentId: task.shipmentId,
        taskStatus: "COMPLETED",
        shipmentStatus: "DELIVERED",
        completedAt,
      };
    },
    {
      timeout: 10_000,
    },
  );
};

export const DeliveryService = {
  assignDelivery,

  startDelivery,

  completeDelivery,
};
