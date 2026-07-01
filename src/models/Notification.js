import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    mensaje: {
      type: String,
      required: true,
      trim: true,
    },
    tipo: {
      type: String,
      enum: [
        "motivacional",
        "recordatorio",
        "alerta",
        "logro",
        "racha",
        "plan",
        "mantenimiento",
        "otro",
      ],
      default: "otro",
    },
    estado: {
      type: String,
      enum: ["PENDIENTE", "ENVIADO", "FALLIDO"],
      default: "PENDIENTE",
    },
    origen: {
      // de dónde vino: "http" (POST /notify) o el evento de RabbitMQ
      type: String,
      default: "http",
    },
    fecha: {
      type: String, // YYYY-MM-DD, fácil de filtrar/mostrar
      default: () => new Date().toISOString().slice(0, 10),
    },
  },
  { timestamps: true } // createdAt, updatedAt automáticos
);

export const Notification = mongoose.model("Notification", NotificationSchema);
