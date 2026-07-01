import mongoose from "mongoose";

/**
 * Conecta a MongoDB usando la URI definida en .env
 * Se llama una sola vez al arrancar el server.js
 */
export async function connectMongo() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/calio_notifications";

  mongoose.connection.on("connected", () => {
    console.log(`[mongo] conectado -> ${uri}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] error de conexión:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] desconectado");
  });

  await mongoose.connect(uri);
  return mongoose.connection;
}
