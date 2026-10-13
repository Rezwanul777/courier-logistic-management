import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IAuditQuery,
	IChangeUserStatus,
	IUpdateProfile,
	IUserListQuery,
} from "./user.interface";

// Never return passwordHash, googleId, tokenVersion or refresh sessions.
const safeSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	role: true,
	emailVerified: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.UserSelect;

const meta = (page: number, limit: number, total: number) => ({
	page,
	limit,
	total,
	totalPages: Math.ceil(total / limit),
});

async function getProfile(userId: number) {
	const user = await prisma.user.findFirst({
		where: { id: userId, deletedAt: null, isActive: true },
		select: safeSelect,
	});
	if (!user) throw new AppError(404, "User not found");
	return user;
}

async function updateProfile(
	userId: number,
	input: IUpdateProfile,
	requestId: string,
) {
	return prisma.$transaction(async (tx) => {
		const previous = await tx.user.findFirst({
			where: { id: userId, deletedAt: null, isActive: true },
			select: safeSelect,
		});
		if (!previous) throw new AppError(404, "User not found");
		const updated = await tx.user.updateMany({
			where: {
				id: userId,
				deletedAt: null,
				isActive: true,
				updatedAt: previous.updatedAt,
			},
			data: input,
		});
		if (updated.count !== 1)
			throw new AppError(409, "Profile changed; reload and retry");
		const user = await tx.user.findUniqueOrThrow({
			where: { id: userId },
			select: safeSelect,
		});
		await tx.auditLog.create({
			data: {
				actorId: userId,
				action: "USER_PROFILE_UPDATED",
				entityType: "User",
				entityId: userId,
				requestId,
				before: { name: previous.name, phone: previous.phone },
				after: { name: user.name, phone: user.phone },
			},
		});
		return user;
	});
}

async function listUsers(query: IUserListQuery) {
	const { page, limit, search, role, isActive, sortBy, sortOrder } = query;
	const where: Prisma.UserWhereInput = {
		deletedAt: null,
		role,
		isActive,
		...(search
			? {
					OR: [
						{ name: { contains: search, mode: "insensitive" } },
						{ email: { contains: search, mode: "insensitive" } },
						{ phone: { contains: search } },
					],
				}
			: {}),
	};
	const [data, total] = await prisma.$transaction(
		[
			prisma.user.findMany({
				where,
				select: safeSelect,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: [{ [sortBy]: sortOrder }, { id: "asc" }],
			}),
			prisma.user.count({ where }),
		],
		{ isolationLevel: "RepeatableRead" },
	);
	return { data, meta: meta(page, limit, total) };
}

async function getUser(id: number) {
	const user = await prisma.user.findFirst({
		where: { id, deletedAt: null },
		select: safeSelect,
	});
	if (!user) throw new AppError(404, "User not found");
	return user;
}


async function changeAccount(
  actorId: number,
  id: number,
  input: IChangeUserStatus,
  requestId: string,
  deleting = false,
) {
  if (actorId === id) {
    throw new AppError(
      403,
      "You cannot deactivate or archive your own account.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const previous = await tx.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: safeSelect,
    });

    if (!previous) {
      throw new AppError(404, "User not found.");
    }

    // Admin accounts are protected.
    if (previous.role === "ADMIN") {
      throw new AppError(
        403,
        "Admin accounts cannot be modified here.",
      );
    }

    const nextActive = deleting
      ? false
      : input.isActive;

    if (
      !deleting &&
      previous.isActive === nextActive
    ) {
      throw new AppError(
        409,
        "Account already has the requested status.",
      );
    }

    // Do not disable or archive a courier
    // who still has outstanding tasks.
    const protectCourierTasks =
      previous.role === "COURIER" &&
      !nextActive;

    if (protectCourierTasks) {
      const outstanding = await tx.courierTask.count({
        where: {
          courierId: id,
          status: {
            in: ["ASSIGNED", "ACCEPTED"],
          },
        },
      });

      if (outstanding > 0) {
        throw new AppError(
          409,
          "This courier has outstanding tasks. Complete or reassign them first.",
        );
      }
    }

    const updated = await tx.user.updateMany({
      where: {
        id,
        deletedAt: null,
        updatedAt: previous.updatedAt,
        role: {
          in: ["CUSTOMER", "COURIER"],
        },

        // Recheck at the update boundary.
        ...(protectCourierTasks
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
        isActive: nextActive,

        ...(deleting
          ? { deletedAt: new Date() }
          : {}),

        // Invalidate all older access tokens.
        tokenVersion: {
          increment: 1,
        },
      },
    });

    if (updated.count !== 1) {
      throw new AppError(
        409,
        "Account changed or has outstanding tasks. Refresh and retry.",
      );
    }

    // Revoke refresh sessions.
    await tx.refreshSession.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Keep a permanent audit trail.
    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "User",
        entityId: id,
        requestId,
        reason: input.reason,

        action: deleting
          ? "USER_DELETED"
          : nextActive
            ? "USER_ACTIVATED"
            : "USER_DEACTIVATED",

        before: {
          isActive: previous.isActive,
          deleted: false,
        },

        after: {
          isActive: nextActive,
          deleted: deleting,
        },
      },
    });

    if (deleting) {
      return null;
    }

    return tx.user.findUniqueOrThrow({
      where: { id },
      select: safeSelect,
    });
  });
}



async function listAuditLogs(query: IAuditQuery) {
  const {
    page,
    limit,
    actorId,
    entityId,
    entityType,
    action,
    from,
    to,
  } = query;

  // -------------------------------------------
  // UTC date boundaries
  // -------------------------------------------

  const startDate = from
    ? new Date(`${from}T00:00:00.000Z`)
    : undefined;

  let endExclusive: Date | undefined;

  if (to) {
    endExclusive = new Date(
      `${to}T00:00:00.000Z`,
    );

    endExclusive.setUTCDate(
      endExclusive.getUTCDate() + 1,
    );
  }

  // -------------------------------------------
  // Build Prisma filters
  // -------------------------------------------

  const where: Prisma.AuditLogWhereInput = {
    ...(actorId !== undefined
      ? { actorId }
      : {}),

    ...(entityId !== undefined
      ? { entityId }
      : {}),

    ...(entityType
      ? {
          entityType: {
            equals: entityType,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(action
      ? { action }
      : {}),

    ...(startDate || endExclusive
      ? {
          createdAt: {
            ...(startDate
              ? { gte: startDate }
              : {}),

            ...(endExclusive
              ? { lt: endExclusive }
              : {}),
          },
        }
      : {}),
  };

  // -------------------------------------------
  // Retrieve real audit events
  // -------------------------------------------

  const [data, total] = await prisma.$transaction(
    [
      prisma.auditLog.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],

        select: {
          id: true,
          actorId: true,
          action: true,
          entityType: true,
          entityId: true,
          reason: true,
          requestId: true,
          createdAt: true,

          // Include the actor's display information.
          // Never expose password or token fields.
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      prisma.auditLog.count({
        where,
      }),
    ],
    {
      isolationLevel: "RepeatableRead",
    },
  );

  return {
    data,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export const UserService = {
	getProfile,
	updateProfile,
	listUsers,
	getUser,
	changeAccount,
	listAuditLogs,
};
