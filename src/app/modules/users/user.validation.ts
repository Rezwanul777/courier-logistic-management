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
  reason: z
    .string()
    .trim()
    .min(5, "Provide a reason of at least 5 characters.")
    .max(500),
});

const id = z.coerce.number().int().positive().max(2147483647);

const isoDay = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must use YYYY-MM-DD format.",
  )
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date.");


const optionalFilter = <T extends z.ZodType>(
  schema: T,
) =>
  z.preprocess(
    (value) => value === "" ? undefined : value,
    schema.optional(),
  );


const auditQuery = z
  .strictObject({
    ...pagination,


actorId: optionalFilter(id),
entityId: optionalFilter(id),

entityType: optionalFilter(
  z.string()
    .trim()
    .regex(/^[A-Za-z][A-Za-z0-9_]{0,59}$/),
),

action: optionalFilter(
  z.string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,80}$/),
),

from: optionalFilter(isoDay),
to: optionalFilter(isoDay),

  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      value.from <= value.to,
    {
      path: ["to"],
      message: "End date must not precede start date.",
    },
  );

export const UserValidation = {
	updateProfile,
	listUsers,
	changeStatus,
	removeUser,
	id,
	auditQuery,
};
