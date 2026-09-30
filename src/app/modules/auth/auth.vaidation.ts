import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const registerSchema = z.strictObject({
	name: z.string().trim().min(2).max(100),
	email,
	password: z.string().min(6).max(128),
});
const verifySchema = z.strictObject({
	email,
	otp: z.string().regex(/^\d{6}$/),
});
const loginSchema = z.strictObject({
	email,
	password: z.string().min(6),
});
const googleSchema = z.strictObject({ idToken: z.string().min(20) });
const refreshSchema = z.strictObject({
	refreshToken: z.string().min(40),
});

const forgotPasswordSchema = z.strictObject({ email });
const resetPasswordSchema = z.strictObject({
	email,
	otp: z.string().regex(/^\d{6}$/, "OTP must contain exactly six digits"),
	newPassword: z
		.string()
		.min(6)
		.max(72)
		.regex(/[a-z]/, "Include a lowercase letter")
		.regex(/[A-Z]/, "Include an uppercase letter")
		.regex(/[0-9]/, "Include a number")
		.regex(/[^A-Za-z0-9]/, "Include a special character")
		.refine(
			(value) => Buffer.byteLength(value, "utf8") <= 72,
			"Password must not exceed 72 UTF-8 bytes",
		),
});

const googleLogin = z.object({

  idToken:
    z.string()
    .min(20),

});

export const AuthValidation = {
	forgotPassword: forgotPasswordSchema,
	resetPassword: resetPasswordSchema,
	registerCustomer: registerSchema,
	verifyEmail: verifySchema,
	loginUser: loginSchema,
	googleLogin: googleLogin,
	refreshToken: refreshSchema,
	logout: refreshSchema,
};
