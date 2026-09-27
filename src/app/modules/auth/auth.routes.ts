import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { auth } from "../../middleware/checkAuth";
import { readRefreshCookie } from "../../middleware/cookieAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.vaidation";


const router = Router();
const limited = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	message: { success: false, message: "Too many requests", errors: [] },
});
router.post(
	"/register",
	limited,
	validateRequest(AuthValidation.registerCustomer),
	AuthController.registerCustomer,
);
router.post(
	"/verify-email",
	limited,
	validateRequest(AuthValidation.verifyEmail),
	AuthController.verifyEmail,
);
router.post(
	"/login",
	limited,
	validateRequest(AuthValidation.loginUser),
	AuthController.loginUser,
);
router.post(
	"/google-login",
	limited,
	validateRequest(AuthValidation.googleLogin),
	AuthController.googleLogin,
);
router.post(
	"/refresh-token",
	limited,
	readRefreshCookie,
	validateRequest(AuthValidation.refreshToken),
	AuthController.refreshToken,
);
router.post(
	"/logout",
	limited,
	readRefreshCookie,
	validateRequest(AuthValidation.logout),
	AuthController.logout,
);
router.get("/me", auth(), AuthController.getMe);

router.post(
	"/forgot-password",
	limited,
	validateRequest(AuthValidation.forgotPassword),
	AuthController.forgotPassword,
);
router.post(
	"/reset-password",
	limited,
	validateRequest(AuthValidation.resetPassword),
	AuthController.resetPassword,
);

export const AuthRoutes = router;
