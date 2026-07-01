import cron from "node-cron";
import { sendNotification } from "../services/notificationService.js";
import { NotificationRepository } from "../models/notificationRepository.js";

/**
 * Notificaciones recurrentes que no dependen de un evento de RabbitMQ,
 * sino de la hora del día. En un entorno real, en vez de notificar a
 * "todos" se consultaría a Identity/Tracking para saber a qué usuarios
 * les corresponde el recordatorio (p.ej. quién no registró el almuerzo).
 *
 * Aquí se deja el "hook" listo: getUsuariosActivos() es el único punto
 * que habría que conectar a otro microservicio cuando esté disponible.
 */

async function getUsuariosActivos() {
  // TODO: reemplazar por una llamada real a Identity/Tracking Service.
  // Por ahora se obtienen los userId distintos que ya tienen notificaciones,
  // para no enviar notificaciones programadas a nadie en un entorno de pruebas vacío.
  const ids = await NotificationRepository.findAll({ limit: 1000 });
  const userIds = [...new Set(ids.map((n) => n.userId))];
  return userIds;
}

async function notificarATodos(titulo, mensaje, tipo) {
  const usuarios = await getUsuariosActivos();
  if (usuarios.length === 0) {
    console.log(`[cron] "${titulo}" - sin usuarios activos registrados, se omite`);
    return;
  }
  for (const userId of usuarios) {
    await sendNotification({ userId, titulo, mensaje, tipo, origen: "cron" });
  }
  console.log(`[cron] "${titulo}" enviado a ${usuarios.length} usuario(s)`);
}

export function startSchedulers() {
  // 08:00 - Recordar desayuno
  cron.schedule("0 8 * * *", () => {
    notificarATodos("Buenos días", "No olvides registrar tu desayuno.", "recordatorio");
  });

  // 12:30 - Recordar almuerzo
  cron.schedule("30 12 * * *", () => {
    notificarATodos("Hora del almuerzo", "Recuerda registrar tu almuerzo.", "recordatorio");
  });

  // 15:00 - Beber agua
  cron.schedule("0 15 * * *", () => {
    notificarATodos("Hidratación", "Recuerda beber un vaso de agua.", "recordatorio");
  });

  // 20:00 - Actualizar peso
  cron.schedule("0 20 * * *", () => {
    notificarATodos("Actualiza tu peso", "No olvides registrar tu peso de hoy.", "recordatorio");
  });

  console.log("[cron] schedulers programados (08:00, 12:30, 15:00, 20:00)");
}
