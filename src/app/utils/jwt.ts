import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const createToken = (
	payload: JwtPayload,
	secret: string,
	expiresIn: NonNullable<SignOptions["expiresIn"]>,
) => jwt.sign(payload, secret, { expiresIn, algorithm: "HS256" });

const verifyToken = (token: string, secret: string) => {
	try {
		const data = jwt.verify(token, secret, { algorithms: ["HS256"] });
		if (typeof data === "string") throw new Error("Invalid token payload");
		return { success: true as const, data };
	} catch (error: unknown) {
		return {
			success: false as const,
			error: error instanceof Error ? error.message : "Invalid token",
		};
	}
};

export const jwtUtils = { createToken, verifyToken };
