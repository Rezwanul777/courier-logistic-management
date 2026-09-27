import nodemailer from "nodemailer";
import config from "../config";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: { user: config.smtp_user, pass: config.smtp_password },
});

export async function sendVerificationEmail(email: string, otp: string) {
	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Verify your courier account",
		text: `Your verification code is ${otp}. It expires in 5 minutes.`,
	});
}

export async function sendPasswordResetEmail(email: string, otp: string) {
	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Reset your courier account password",
		text: `Your password reset code is ${otp}. It expires in 5 minutes. If you did not request this, ignore this email.`,
	});
}
