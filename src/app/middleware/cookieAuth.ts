import type { RequestHandler } from "express";
import config from "../config";
import { AppError } from "../utils/AppError";

// Browser writes must originate from an explicitly trusted origin.
// Postman normally omits Origin and remains supported.
export const checkRequestOrigin: RequestHandler = (req, _res, next) => {
	if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
	const origin = req.headers.origin;
	const allowed = [config.frontend_url, process.env.BACKEND_URL].filter(
		Boolean,
	);
	if (
		(origin && !allowed.includes(origin)) ||
		(!origin && req.headers["sec-fetch-site"] === "cross-site")
	) {
		return next(new AppError(403, "Request origin is not allowed"));
	}
	next();
};

export const readRefreshCookie: RequestHandler = (req, _res, next) => {
	if (req.body == null) req.body = {};
	if (
		typeof req.body === "object" &&
		!Array.isArray(req.body) &&
		req.body.refreshToken === undefined
	) {
		req.body.refreshToken = req.cookies?.refreshToken;
	}
	next();
};
