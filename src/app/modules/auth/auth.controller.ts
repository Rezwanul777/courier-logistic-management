import config from "../../config";
import { AppError } from "../../utils/AppError";
import { clearAuthCookies, setAuthCookies } from "../../utils/authCookies";
import { catchAsync } from "../../utils/catchAsync";
import { jwtUtils } from "../../utils/jwt";
import { sendResponse } from "../../utils/sendResponse";
import type { IRefreshTokenPayload } from "./auth.interface";
import { AuthService } from "./auth.service";
import  httpStatus  from 'http-status';

const registerCustomer = catchAsync(async (req, res) => {
  await AuthService.registerCustomer(req.body);
  sendResponse(res, {
    statusCode: 202,
    success: true,
    message: "Verification code sent",
    data: null,
  });
});
// const verifyEmail = catchAsync(async (req, res) => {
//   const data = await AuthService.verifyEmail(req.body);
//   setAuthCookies(res, data);
//   sendResponse(res, {
//     statusCode: 201,
//     success: true,
//     message: "Email verified",
//     data,
//   });
// });

const verifyEmail = catchAsync(async (req, res) => {
  const startedAt = Date.now();

  // Never log emails, OTPs, passwords, or tokens.
  console.info("[Verify Email] Request received");

  const data = await AuthService.verifyEmail(req.body);

  console.info("[Verify Email] User/session processed", {
    durationMs: Date.now() - startedAt,
  });

  setAuthCookies(res, data);

  console.info("[Verify Email] Cookies prepared");

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Email verified",
    data,
  });

  console.info("[Verify Email] Response sent");
});

const loginUser = catchAsync(async (req, res) => {
  const data = await AuthService.loginUser(req.body);
  setAuthCookies(res, data);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged in",
    data,
  });
});


const googleLogin = catchAsync(async (req, res) => {
	const data = await AuthService.googleLogin(req.body);
	setAuthCookies(res, data);
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Logged in with Google",
		data,
	});
});





const refreshToken = catchAsync(async (req, res) => {
  const payload: IRefreshTokenPayload = req.body;
  const data = await AuthService.refreshToken(payload.refreshToken);
  setAuthCookies(res, data);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tokens refreshed",
    data,
  });
});
const logout = catchAsync(async (req, res) => {
  const payload: IRefreshTokenPayload = req.body;
  await AuthService.logout(payload.refreshToken);
  clearAuthCookies(res);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged out",
    data: null,
  });
});
const getMe = catchAsync(async (req, res) => {
  if (!req.user) throw new AppError(401, "Bearer token required");
  const data = await AuthService.getMe(req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile fetched",
    data,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  await AuthService.forgotPassword(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:
      "If this account supports password reset, a verification code has been sent.",
    data: null,
  });
});
const resetPassword = catchAsync(async (req, res) => {
  await AuthService.resetPassword(req.body);
  clearAuthCookies(res);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset successfully. Please log in again.",
    data: null,
  });
});


const getLoginMethods = catchAsync(
  async (req, res) => {
    if (!req.user) {
      throw new AppError(401, "Please sign in.");
    }

    const data = await AuthService.getLoginMethods(
      req.user.userId,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Login methods retrieved",
      data,
    });
  },
);

const setPassword = catchAsync(
  async (req, res) => {
    if (!req.user) {
      throw new AppError(401, "Please sign in.");
    }

    await AuthService.setPasswordForGoogleCustomer(
      req.user.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Password login enabled",
      data: null,
    });
  },
);

const linkGoogle = catchAsync(
  async (req, res) => {
    if (!req.user) {
      throw new AppError(401, "Please sign in.");
    }

    await AuthService.linkGoogleToCustomer(
      req.user.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Google login enabled",
      data: null,
    });
  },
);





export const AuthController = {
  forgotPassword,
  resetPassword,
  registerCustomer,
  verifyEmail,
  loginUser,
  googleLogin,
  refreshToken,
  logout,
  getMe,
  getLoginMethods,
  setPassword,
  linkGoogle,
};
