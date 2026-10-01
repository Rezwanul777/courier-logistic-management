import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

// const createToken = (
// 	payload: JwtPayload,
// 	secret: string,
// 	expiresIn: NonNullable<SignOptions["expiresIn"]>,
// ) => jwt.sign(payload, secret, { expiresIn, algorithm: "HS256" });

// const verifyToken = (token: string, secret: string) => {
// 	try {
// 		const data = jwt.verify(token, secret, { algorithms: ["HS256"] });
// 		if (typeof data === "string") throw new Error("Invalid token payload");
// 		return { success: true as const, data };
// 	} catch (error: unknown) {
// 		return {
// 			success: false as const,
// 			error: error instanceof Error ? error.message : "Invalid token",
// 		};
// 	}
// };

// export const jwtUtils = { createToken, verifyToken };

// export interface IJwtPayload {
//   [x: string]: string;
//   userId: number;

//   role: "CUSTOMER" | "COURIER" | "ADMIN";

//   type: "access" | "refresh";

//   jti: string;

//   tokenVersion: number;

//   iat?: number;

//   exp?: number;
// }


// const createToken = (
//   payload: IJwtPayload,
//   secret: string,
//   expiresIn: string,
// ) => {

//   return jwt.sign(
//     payload,
//     secret,
//     {
//       expiresIn: expiresIn as any,
//     },
//   );

// };



// const verifyToken = (
//   token:string,
//   secret:string,
// )=>{

//   try{

//     const verifiedToken =
//       jwt.verify(token, secret) as IJwtPayload;


//     return {
//       success:true,
//       data:verifiedToken,
//     };


//   }catch(error:any){

//     return {
//       success:false,
//       error:error.message,
//     };

//   }

// };


// export const jwtUtils={
//   createToken,
//   verifyToken,
// };


const createToken = (
	payload: JwtPayload,
	secret: string,
	expiresIn: SignOptions,
) => {
	const token = jwt.sign(payload, secret, {
		expiresIn,
	} as SignOptions);

	return token;
};

const verifyToken = (token: string, secret: string) => {
	try {
		const verifiedToken = jwt.verify(token, secret);
		return {
			success: true,
			data: verifiedToken,
		};
	} catch (error: any) {
		console.log("Token verification failed:", error);
		return {
			success: false,
			error: error.message,
		};
	}
};

export const jwtUtils = {
	createToken,
	verifyToken,
};
