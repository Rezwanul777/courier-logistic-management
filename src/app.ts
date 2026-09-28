import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import httpStatus from "http-status";
import config from "./app/config";
import { checkRequestOrigin } from "./app/middleware/cookieAuth";
import { globalErrorHandler } from "./app/middleware/globalErrorhandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/modules/auth/auth.routes";
import { AdminUserRoutes, UserRoutes } from "./app/modules/users/user.routes";
import { AdminZoneRoutes, ZoneRoutes } from "./app/modules/zone/zone.route";

const app: Application = express();
app.use(helmet());
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 300,
		standardHeaders: "draft-8",
		legacyHeaders: false,
	}),
);

app.use(
	cors({
		origin: config.frontend_url || false,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(checkRequestOrigin);

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/admin", AdminUserRoutes);
app.use("/api/v1/zones", ZoneRoutes);
app.use("/api/v1/admin/zones", AdminZoneRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Courier & Logistics API",
		data: null,
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;

