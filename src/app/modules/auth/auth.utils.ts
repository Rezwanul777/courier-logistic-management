import { randomUUID } from "node:crypto";
import type { SignOptions } from "jsonwebtoken";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";
import type { ITokenUser } from "./auth.interface";

const generateTokens = (user: ITokenUser) => {
	const payload = {
		sub: String(user.id),
		email: user.email,
		role: user.role,
		tokenVersion: user.tokenVersion,
	};
	const accessToken = jwtUtils.createToken(
		{ ...payload, type: "access" },
		config.jwt_access_secret,
		config.jwt_access_expires_in as NonNullable<SignOptions["expiresIn"]>,
	);
	const refreshToken = jwtUtils.createToken(
		{ ...payload, type: "refresh", jti: randomUUID() },
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as NonNullable<SignOptions["expiresIn"]>,
	);
	const verified = jwtUtils.verifyToken(
		refreshToken,
		config.jwt_refresh_secret,
	);
	if (!verified.success || typeof verified.data.exp !== "number") {
		throw new Error("Could not determine refresh token expiry");
	}
	return {
		accessToken,
		refreshToken,
		refreshExpiresAt: new Date(verified.data.exp * 1000),
	};
};

export const AuthUtils = { generateTokens };
