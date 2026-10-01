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
	console.log("CHANGE ACCOUNT HIT",{
 actorId,
 id,
 deleting,
 input
});
	if (actorId === id)
		throw new AppError(403, "You cannot disable or delete your own account");
	return prisma.$transaction(async (tx) => {
		const previous = await tx.user.findFirst({
			where: { id},
			select: safeSelect,
		});
		if (!previous) throw new AppError(404, "User not found");
		// Admin accounts are deliberately excluded, protecting the last admin too.
		if (previous.role === "ADMIN")
			throw new AppError(403, "Admin accounts cannot be changed here");
		if (!deleting && previous.isActive === input.isActive)
			throw new AppError(409, "Account already has the requested status");
		const updated = await tx.user.updateMany({
	where: {
		id,
		updatedAt: previous.updatedAt,
		role: { in: ["CUSTOMER", "COURIER"] },
	},
	data: {
		isActive: deleting ? false : input.isActive,

		...(deleting
			? { deletedAt: new Date() }
			: { deletedAt: null }
		),

		tokenVersion: {
			increment: 1
		},
	},
});;
		if (updated.count !== 1)
			throw new AppError(409, "Account changed; reload and retry");
		await tx.refreshSession.updateMany({
			where: { userId: id, revokedAt: null },
			data: { revokedAt: new Date() },
		});
		await tx.auditLog.create({
			data: {
				actorId,
				entityType: "User",
				entityId: id,
				requestId,
				reason: input.reason,
				action: deleting
					? "USER_DELETED"
					: input.isActive
						? "USER_ACTIVATED"
						: "USER_DEACTIVATED",
				before: { isActive: previous.isActive, deleted: false },
				after: {
					isActive: deleting ? false : input.isActive,
					deleted: deleting,
				},
			},
		});
		return deleting
			? null
			: tx.user.findUniqueOrThrow({ where: { id }, select: safeSelect });
	});
}

async function listAuditLogs(query: IAuditQuery) {
	const { page, limit, actorId, entityId, action } = query;
	const where: Prisma.AuditLogWhereInput = {
		actorId,
		entityId,
		action,
		entityType: "User",
	};
	const [data, total] = await prisma.$transaction(
		[
			prisma.auditLog.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					actorId: true,
					action: true,
					entityType: true,
					entityId: true,
					reason: true,
					before: true,
					after: true,
					requestId: true,
					createdAt: true,
				},
			}),
			prisma.auditLog.count({ where }),
		],
		{ isolationLevel: "RepeatableRead" },
	);
	return { data, meta: meta(page, limit, total) };
}
export const UserService = {
	getProfile,
	updateProfile,
	listUsers,
	getUser,
	changeAccount,
	listAuditLogs,
};
