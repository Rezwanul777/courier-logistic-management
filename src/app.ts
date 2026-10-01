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
import { AdminHubRoutes, HubRoutes } from "./app/modules/hub/hub.route";
import { RateCardRoutes } from "./app/modules/rateCard/rateCard.route";
import {
  AdminShipmentRoutes,
  ShipmentRoutes,
} from "./app/modules/shipment/shipment.route";
import { PaymentRoutes } from "./app/modules/payment/payment.route";
import { PaymentController } from "./app/modules/payment/payment.controller";
import { CourierRoutes } from "./app/modules/courier/courier.route";
import { AdminTaskRoutes, TaskRoutes } from "./app/modules/task/task.route";
import { HubTransferRoutes } from "./app/modules/hub-transfer/hub-transfer.route";
import { AdminDeliveryRoutes, DeliveryRoutes } from "./app/modules/delivery/delivery.route";

const app: Application = express();

app.post(
  "/api/v1/payments/webhook",
  express.raw({
    type: "application/json",
  }),
  PaymentController.webhook,
);

app.set(
  "trust proxy",
  1
);

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
app.use((req,res,next)=>{
 console.log(
   "REQUEST",
   req.method,
   req.path,
   req.body
 );
 next();
});
//app.use(checkRequestOrigin);

//requirement of all routes to be prefixed with /api/v1

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/admin", AdminUserRoutes);
app.use("/api/v1/zones", ZoneRoutes);
app.use("/api/v1/admin/zones", AdminZoneRoutes);
app.use("/api/v1/hubs", HubRoutes);
app.use("/api/v1/admin/hubs", AdminHubRoutes);
app.use("/api/v1/admin/rates", RateCardRoutes);
app.use("/api/v1/shipments", ShipmentRoutes);
app.use("/api/v1/admin/shipments", AdminShipmentRoutes);
app.use("/api/v1/payments", PaymentRoutes);
app.use("/api/v1/admin/couriers", CourierRoutes);
app.use("/api/v1/admin/tasks", AdminTaskRoutes);
app.use("/api/v1/tasks", TaskRoutes);
app.use("/api/v1/admin/hub-transfers", HubTransferRoutes);
app.use("/api/v1/admin", AdminDeliveryRoutes);
app.use("/api/v1", DeliveryRoutes);

// Basic rout
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
