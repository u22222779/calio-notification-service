import { NotificationRepository } from "../models/notificationRepository.js";
import { sendPush } from "./pushService.js";

const TIPOS_VALIDOS = [
  "motivacional",
  "recordatorio",
  "alerta",
  "logro",
  "racha",
  "plan",
  "mantenimiento",
  "otro",
];

/**
 * Flujo central del servicio (según el documento):
 *  1. Validar datos
 *  2. Crear mensaje
 *  3. Enviar push
 *  4. Guardar historial
 *  5. Responder
 */
export async function sendNotification({ userId, titulo, mensaje, tipo, origen = "http", deviceToken = null }) {
  // 1. Validar
  if (!userId || !titulo || !mensaje) {
    const err = new Error("userId, titulo y mensaje son obligatorios");
    err.status = 400;
    throw err;
  }

  const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : "otro";

  // 2. Crear el registro inicial en estado PENDIENTE
  let notification = await NotificationRepository.create({
    userId,
    titulo,
    mensaje,
    tipo: tipoFinal,
    estado: "PENDIENTE",
    origen,
  });

  // 3. Enviar push (real o simulado)
  const pushResult = await sendPush({ userId, titulo, mensaje, deviceToken });

  // 4. Actualizar estado según resultado
  const estadoFinal = pushResult.error ? "FALLIDO" : "ENVIADO";
  notification = await NotificationRepository.updateEstado(notification._id, estadoFinal);

  // 5. Responder
  return { notification, push: pushResult };
}

export async function listAll(query) {
  return NotificationRepository.findAll(query);
}

export async function listByUser(userId, query) {
  return NotificationRepository.findByUser(userId, query);
}

export async function removeById(id) {
  return NotificationRepository.deleteById(id);
}

/**
 * Mapea un evento de RabbitMQ (routing key) a un título/mensaje/tipo
 * de notificación legible para el usuario.
 * Aquí es donde Notification "decide" si vale la pena notificar.
 */
export function buildMessageFromEvent(evento, payload) {
  switch (evento) {
    case "logro.alcanzado":
      return {
        titulo: "¡Excelente!",
        mensaje: `Llevas ${payload.dias ?? "varios"} días consecutivos cumpliendo tu meta.`,
        tipo: "logro",
      };
    case "racha.detectada":
      return {
        titulo: "🔥 ¡Increíble!",
        mensaje: `Llevas ${payload.dias ?? "varios"} días seguidos cumpliendo tus metas.`,
        tipo: "racha",
      };
    case "plan.generado":
      return {
        titulo: "Tu plan está listo",
        mensaje: "Ya está disponible tu plan semanal personalizado.",
        tipo: "plan",
      };
    case "peso.actualizado":
      return {
        titulo: "Peso actualizado",
        mensaje: `Registramos tu nuevo peso: ${payload.peso ?? "—"} kg.`,
        tipo: "recordatorio",
      };
    case "calorias.excedidas":
      return {
        titulo: "Cuidado con las calorías",
        mensaje: "Superaste tu meta calórica de hoy.",
        tipo: "alerta",
      };
    case "agua.recordatorio":
      return {
        titulo: "Hora de hidratarte",
        mensaje: "Recuerda beber un vaso de agua.",
        tipo: "recordatorio",
      };
    case "mantenimiento":
      return {
        titulo: "Mantenimiento programado",
        mensaje: payload.mensaje ?? "El sistema entrará en mantenimiento próximamente.",
        tipo: "mantenimiento",
      };
    case "comida.registrada":
      return {
        titulo: "Comida registrada",
        mensaje: `Tu ${payload.tipoComida ?? "comida"} fue registrada correctamente.`,
        tipo: "motivacional",
      };
    default:
      return null; // evento desconocido -> no se notifica
  }
}
