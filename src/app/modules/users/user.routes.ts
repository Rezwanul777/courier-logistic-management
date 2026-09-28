import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();
router.use(auth());
router.get("/me", UserController.getProfile);
router.patch(
	"/me",
	validateRequest(UserValidation.updateProfile),
	UserController.updateProfile,
);

const adminRouter = Router();
adminRouter.use(auth("ADMIN"));
adminRouter.get("/users", UserController.listUsers);
adminRouter.get("/users/:id", UserController.getUser);
adminRouter.patch(
	"/users/:id/status",
	validateRequest(UserValidation.changeStatus),
	UserController.changeStatus,
);
adminRouter.delete(
	"/users/:id",
	validateRequest(UserValidation.removeUser),
	UserController.removeUser,
);
adminRouter.get("/audit-logs", UserController.listAuditLogs);

export const UserRoutes = router;
export const AdminUserRoutes = adminRouter;
