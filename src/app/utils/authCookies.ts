import type { CookieOptions, Response } from "express";
import config from "../config";
import { jwtUtils } from "./jwt";

const options = (path: string): CookieOptions => ({
	httpOnly: true,
	secure: config.node_env === "production",
	sameSite: "lax",
	path,
});

export const setAuthCookies = (
	res: Response,
	tokens: { accessToken: string; refreshToken: string },
) => {
	const access = jwtUtils.verifyToken(
		tokens.accessToken,
		config.jwt_access_secret,
	);
	const refresh = jwtUtils.verifyToken(
		tokens.refreshToken,
		config.jwt_refresh_secret,
	);
	if (
		!access.success ||
		!refresh.success ||
		!access.data.exp ||
		!refresh.data.exp
	) {
		throw new Error("Cannot set cookies for invalid tokens");
	}
	res.cookie("accessToken", tokens.accessToken, {
		...options("/api/v1"),
		expires: new Date(access.data.exp * 1000),
	});
	res.cookie("refreshToken", tokens.refreshToken, {
		...options("/api/v1/auth"),
		expires: new Date(refresh.data.exp * 1000),
	});
};

export const clearAuthCookies = (res: Response) => {
	res.clearCookie("accessToken", options("/api/v1"));
	res.clearCookie("refreshToken", options("/api/v1/auth"));
};
