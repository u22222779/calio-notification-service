import { Hono } from "hono";
import { NotificationController } from "../controllers/notificationController.js";

export const notificationRoutes = new Hono();

notificationRoutes.post("/notify", NotificationController.notify);
notificationRoutes.get("/notifications", NotificationController.getAll);
notificationRoutes.get("/notifications/:userId", NotificationController.getByUser);
notificationRoutes.delete("/notifications/:id", NotificationController.remove);
