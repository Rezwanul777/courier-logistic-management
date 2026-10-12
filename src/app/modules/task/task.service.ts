import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { Prisma } from "../../../generated/prisma/client";

const assignPickup = async (
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
    throw new AppError(400, "Invalid shipment or courier ID.");
  }

  return prisma.$transaction(
    async (tx) => {
      // 1. Validate shipment.
      const shipment = await tx.shipment.findFirst({
        where: {
          id: shipmentId,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          payment: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!shipment) {
        throw new AppError(404, "Shipment not found.");
      }

      if (shipment.status !== "READY_FOR_PICKUP") {
        throw new AppError(
          409,
          "This shipment is not available for pickup assignment.",
        );
      }

      // Pickup is allowed only after the webhook
      // has verified successful payment.
      if (shipment.payment?.status !== "PAID") {
        throw new AppError(
          409,
          "Shipment payment must be verified before assigning pickup.",
        );
      }

      // 2. Validate the selected courier.
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
          "Selected courier is not active or does not exist.",
        );
      }

      // 3. Atomically transition the shipment.
      //
      // This conditional UPDATE prevents two
      // concurrent requests from both assigning
      // the same READY_FOR_PICKUP shipment.
      const transition = await tx.shipment.updateMany({
        where: {
          id: shipmentId,
          deletedAt: null,
          status: "READY_FOR_PICKUP",

          payment: {
            is: {
              status: "PAID",
            },
          },
        },

        data: {
          status: "PICKUP_ASSIGNED",
        },
      });

      if (transition.count !== 1) {
        throw new AppError(
          409,
          "This shipment was already assigned or its status changed.",
        );
      }

      // 4. Create the courier pickup task.
      const task = await tx.courierTask.create({
        data: {
          shipmentId,
          courierId,
          assignedById: adminId,
          type: "PICKUP",
          status: "ASSIGNED",
        },
      });

      // 5. Record the status transition.
      await tx.trackingEvent.create({
        data: {
          shipmentId,
          previousStatus: "READY_FOR_PICKUP",
          newStatus: "PICKUP_ASSIGNED",
          actorId: adminId,
          reason: "Courier assigned for pickup",
        },
      });

      return task;
    },
    {
      timeout: 10_000,
    },
  );
};

const courierTaskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  type: z.enum(["ALL", "PICKUP", "DELIVERY"]).default("ALL"),
});

const courierTaskSelect = {
  id: true,
  type: true,
  status: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,

  shipment: {
    select: {
      id: true,
      trackingCode: true,
      status: true,
      description: true,
      weight: true,
      pickupAddress: true,
      recipient: true,

      originHub: {
        select: { name: true },
      },

      destinationHub: {
        select: { name: true },
      },
    },
  },
} satisfies Prisma.CourierTaskSelect;

const getMyTasks = async (courierId: number, query: unknown) => {
  const { page, type } = courierTaskQuerySchema.parse(query);

  const limit = 10;

  const where: Prisma.CourierTaskWhereInput = {
    courierId,
    status: {
      in: ["ASSIGNED", "ACCEPTED"],
    },
    ...(type !== "ALL" ? { type } : {}),
  };

  const [items, total, assigned, accepted, completed] =
    await prisma.$transaction([
      prisma.courierTask.findMany({
        where,
        select: courierTaskSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.courierTask.count({ where }),

      prisma.courierTask.count({
        where: {
          courierId,
          status: "ASSIGNED",
        },
      }),

      prisma.courierTask.count({
        where: {
          courierId,
          status: "ACCEPTED",
        },
      }),

      prisma.courierTask.count({
        where: {
          courierId,
          status: "COMPLETED",
        },
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
    summary: {
      assigned,
      accepted,
      completed,
    },
  };
};

// ---------------------------------------------
// Courier: individual task
// ---------------------------------------------

const getMyTaskById = async (taskId: number, courierId: number) => {
  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    throw new AppError(404, "Task not found.");
  }

  const task = await prisma.courierTask.findFirst({
    where: {
      id: taskId,
      courierId,
    },
    select: courierTaskSelect,
  });

  if (!task) {
    throw new AppError(404, "Task not found.");
  }

  return task;
};

// ---------------------------------------------
// Courier: accept assigned pickup
// ---------------------------------------------

const acceptTask = async (taskId: number, courierId: number) => {
  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    throw new AppError(404, "Task not found.");
  }

  const updated = await prisma.courierTask.updateMany({
    where: {
      id: taskId,
      courierId,
      type: "PICKUP",
      status: "ASSIGNED",
      shipment: {
        is: {
          status: "PICKUP_ASSIGNED",
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
      "Pickup task is unavailable or has already been accepted.",
    );
  }

  return getMyTaskById(taskId, courierId);
};

// ---------------------------------------------
// Courier: complete accepted pickup
// ---------------------------------------------

const completePickup = async (
  taskId: number,
  courierId: number,
  proof: string,
) => {
  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    throw new AppError(404, "Task not found.");
  }

  const confirmationNote = proof.trim();

  if (confirmationNote.length < 3 || confirmationNote.length > 500) {
    throw new AppError(
      400,
      "Pickup confirmation note must contain 3 to 500 characters.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const task = await tx.courierTask.findFirst({
      where: {
        id: taskId,
        courierId,
        type: "PICKUP",
      },
      select: {
        id: true,
        shipmentId: true,
        status: true,
      },
    });

    if (!task) {
      throw new AppError(404, "Pickup task not found.");
    }

    if (task.status !== "ACCEPTED") {
      throw new AppError(
        409,
        "Accept the pickup task before confirming collection.",
      );
    }

    // Only one request can complete the task.
    const taskUpdated = await tx.courierTask.updateMany({
      where: {
        id: taskId,
        courierId,
        type: "PICKUP",
        status: "ACCEPTED",
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        proof: confirmationNote,
      },
    });

    if (taskUpdated.count !== 1) {
      throw new AppError(
        409,
        "This pickup task was already completed or changed.",
      );
    }

    // Only PICKUP_ASSIGNED shipments can
    // advance to PICKED_UP.
    const shipmentUpdated = await tx.shipment.updateMany({
      where: {
        id: task.shipmentId,
        status: "PICKUP_ASSIGNED",
        deletedAt: null,
      },
      data: {
        status: "PICKED_UP",
      },
    });

    if (shipmentUpdated.count !== 1) {
      throw new AppError(
        409,
        "Shipment status changed. Pickup could not be confirmed.",
      );
    }

    await tx.trackingEvent.create({
      data: {
        shipmentId: task.shipmentId,
        previousStatus: "PICKUP_ASSIGNED",
        newStatus: "PICKED_UP",
        actorId: courierId,
        reason: "Courier collected the parcel",
      },
    });

    return {
      taskId: task.id,
      shipmentId: task.shipmentId,
      shipmentStatus: "PICKED_UP",
    };
  });
};


export const TaskService = {
  assignPickup,

  getMyTasks,
  getMyTaskById,

  acceptTask,

  completePickup,
};
