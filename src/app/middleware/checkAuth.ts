import type { RequestHandler } from "express";
import type { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import type { IRequestUser } from "../modules/auth/auth.interface";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";

declare global {
	namespace Express {
		interface Request {
			user?: IRequestUser;
		}
	}
}

export const auth = (...roles: Role[]): RequestHandler =>
	catchAsync(async (req, _res, next) => {
		const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || "");
		if (req.headers.authorization && !match)
			throw new AppError(401, "Invalid Authorization header");
		const token = match?.[1] || req.cookies?.accessToken;
		if (typeof token !== "string" || !token)
			throw new AppError(401, "Please log in to continue");
		const verified = jwtUtils.verifyToken(token, config.jwt_access_secret);
		if (
			!verified.success ||
			verified.data.type !== "access" ||
			!/^\d+$/.test(verified.data.sub || "")
		) {
			throw new AppError(401, "Invalid or expired access token");
		}
		const payload = verified.data;
		const user = await prisma.user.findUnique({
			where: { id: Number(payload.sub) },
			select: {
				id: true,
				email: true,
				role: true,
				isActive: true,
				deletedAt: true,
				emailVerified: true,
				tokenVersion: true,
			},
		});
		if (
			!user?.isActive ||
			user.deletedAt ||
			!user.emailVerified ||
			payload.tokenVersion !== user.tokenVersion
		) {
			throw new AppError(401, "Account is unavailable");
		}
		if (roles.length && !roles.includes(user.role))
			throw new AppError(403, "Forbidden");
		req.user = { userId: user.id, email: user.email, role: user.role };
		next();
	});
