import { Role } from "../../../generated/prisma/enums";

export interface IRegisterCustomerPayload {
	name: string;
	email: string;
	password: string;
}
export interface ILoginUserPayload {
	email: string;
	password: string;
}
export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}
export interface IGoogleLoginPayload {
	idToken: string;
}
export interface IRefreshTokenPayload {
	refreshToken: string;
}
export interface IRequestUser {
	userId: number;
	email: string;
	role: Role;
}
export interface IPendingRegistration {
	name: string;
	email: string;
	passwordHash: string;
	otpHash: string;
}

export interface IForgotPasswordPayload {
	email: string;
}
export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}

export interface ITokenUser {
	id: number;
	email: string;
	role: Role;
	tokenVersion: number;
}

