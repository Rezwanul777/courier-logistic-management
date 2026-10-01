import { z } from "zod";

const pagination = {
	page: z.coerce.number().int().min(1).max(100000).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
};
const updateProfile = z
	.strictObject({
		name: z.string().trim().min(2).max(100).optional(),
		phone: z
			.string()
			.trim()
			.regex(/^\+8801[3-9]\d{8}$/, "Use Bangladesh format: +8801XXXXXXXXX")
			.nullable()
			.optional(),
	})
	.refine((value) => Object.keys(value).length > 0, "Provide name or phone");
const listUsers = z.strictObject({
	...pagination,
	search: z.string().trim().max(100).optional(),
	role: z.enum(["CUSTOMER", "COURIER", "ADMIN"]).optional(),
	isActive: z
		.enum(["true", "false"])
		.transform((value) => value === "true")
		.optional(),
	sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
const changeStatus = z.strictObject({
	isActive: z.boolean(),
	reason: z.string().trim().min(5).max(500),
});
const removeUser = z.strictObject({
	reason: z.string().trim().min(5).max(500).optional(),
});
const id = z.coerce.number().int().positive().max(2147483647);
const auditQuery = z.strictObject({
	...pagination,
	actorId: id.optional(),
	entityId: id.optional(),
	action: z
		.enum([
			"USER_PROFILE_UPDATED",
			"USER_ACTIVATED",
			"USER_DEACTIVATED",
			"USER_DELETED",
		])
		.optional(),
});
export const UserValidation = {
	updateProfile,
	listUsers,
	changeStatus,
	removeUser,
	id,
	auditQuery,
};
