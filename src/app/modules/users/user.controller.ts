import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";
import { UserValidation } from "./user.validation";

function actor(req: Request) {
	if (!req.user) throw new AppError(401, "Please log in to continue");
	return req.user.userId;
}
const getProfile = catchAsync(async (req, res) => {
	const data = await UserService.getProfile(actor(req));
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Profile retrieved",
		data,
	});
});
const updateProfile = catchAsync(async (req, res) => {
	const data = await UserService.updateProfile(
		actor(req),
		req.body,
		randomUUID(),
	);
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Profile updated",
		data,
	});
});
const listUsers = catchAsync(async (req, res) => {
	const result = await UserService.listUsers(
		UserValidation.listUsers.parse(req.query),
	);
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Users retrieved",
		...result,
	});
});
const getUser = catchAsync(async (req, res) => {
	const data = await UserService.getUser(
		UserValidation.id.parse(req.params.id),
	);
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "User retrieved",
		data,
	});
});
const changeStatus = catchAsync(async (req, res) => {
	const data = await UserService.changeAccount(
		actor(req),
		UserValidation.id.parse(req.params.id),
		req.body,
		randomUUID(),
	);
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "User status updated; previous sessions revoked",
		data,
	});
});
const removeUser = catchAsync(async (req, res) => {
	await UserService.changeAccount(
		actor(req),
		UserValidation.id.parse(req.params.id),
		{ isActive: false, reason: req.body.reason },
		randomUUID(),
		true,
	);
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "User soft deleted",
		data: null,
	});
});
const listAuditLogs = catchAsync(async (req, res) => {
	const result = await UserService.listAuditLogs(
		UserValidation.auditQuery.parse(req.query),
	);
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Audit logs retrieved",
		...result,
	});
});
export const UserController = {
	getProfile,
	updateProfile,
	listUsers,
	getUser,
	changeStatus,
	removeUser,
	listAuditLogs,
};
