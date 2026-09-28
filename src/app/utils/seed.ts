import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

const seedConfig = z.object({
	name: z.string().trim().min(2).max(100),
	email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
	password: z
		.string()
		.min(12)
		.refine(
			(value) => Buffer.byteLength(value, "utf8") <= 72,
			"Admin password must not exceed 72 bytes",
		),
	saltRounds: z.coerce.number().int().min(10).max(15),
});

export const seedAdmin = async (): Promise<void> => {
	const parsed = seedConfig.safeParse({
		name: config.admin_name,
		email: config.admin_email,
		password: config.admin_password,
		saltRounds: config.bcrypt_salt_rounds,
	});
	if (!parsed.success) {
		// Never print the configuration or password in validation errors.
		throw new Error(
			"Invalid admin seed configuration: check ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters, max 72 bytes), and BCRYPT_SALT_ROUNDS (10-15)",
		);
	}
	const { name, email, password, saltRounds } = parsed.data;
	const existing = await prisma.user.findUnique({
		where: { email },
		select: {
			role: true,
			isActive: true,
			deletedAt: true,
			emailVerified: true,
			authProvider: true,
			passwordHash: true,
		},
	});
	if (existing) {
		if (
			existing.role !== Role.ADMIN ||
			!existing.isActive ||
			existing.deletedAt ||
			!existing.emailVerified ||
			existing.authProvider !== "CREDENTIAL" ||
			!existing.passwordHash
		) {
			throw new Error(
				"ADMIN_EMAIL belongs to an incompatible or unavailable account. No changes were made.",
			);
		}
		console.log("Admin already exists. No changes were made.");
		return;
	}
	const passwordHash = await bcrypt.hash(password, saltRounds);
	// Email uniqueness prevents duplicate accounts if two seed commands race.
	// An error propagates; no existing account is overwritten or deleted.
	await prisma.user.create({
		data: {
			name,
			email,
			passwordHash,
			role: Role.ADMIN,
			authProvider: "CREDENTIAL",
			emailVerified: true,
			isActive: true,
		},
	});
	console.log("Admin created successfully.");
};
