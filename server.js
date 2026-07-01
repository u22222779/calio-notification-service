import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

import { connectMongo } from "./src/config/mongo.js";
import { notificationRoutes } from "./src/routes/notificationRoutes.js";
import { startNotificationConsumer } from "./src/consumers/rabbitConsumer.js";
import { startSchedulers } from "./src/schedulers/scheduler.js";
import { logRequest } from "./src/middlewares/logger.js";

const PORT = Number(process.env.PORT || 8087);

const app = new Hono();

app.use("*", cors());
app.use("*", logRequest());

// Health check simple, similar al de Spring Actuator
app.get("/health", (c) => c.json({ status: "UP", service: "notification-service" }));

app.route("/", notificationRoutes);

app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));

app.onError((err, c) => {
  console.error("[error]", err);
  return c.json({ error: "Error interno del servidor" }, 500);
});

async function start() {
  try {
    await connectMongo();
  } catch (err) {
    console.error("[mongo] no se pudo conectar:", err.message);
    process.exit(1);
  }

  try {
    await startNotificationConsumer();
  } catch (err) {
    // No tumbamos el servicio si RabbitMQ no está disponible:
    // el endpoint HTTP /notify sigue funcionando igual.
    console.error("[rabbitmq] no se pudo conectar, el consumidor no arrancó:", err.message);
  }

  startSchedulers();

  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`🔔 notification-service escuchando en http://localhost:${info.port}`);
  });
}

start();
