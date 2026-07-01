import { initFirebase, isFirebaseEnabled } from "../config/firebase.js";

/**
 * Envía un push real con Firebase Cloud Messaging si está habilitado,
 * o "simula" el envío (solo log) si no hay credenciales configuradas.
 *
 * En un proyecto real, el deviceToken se obtendría del Identity Service
 * (guardado cuando el usuario hace login desde la app). Aquí se deja
 * como parámetro opcional para que el resto del flujo no se bloquee.
 */
export async function sendPush({ userId, titulo, mensaje, deviceToken = null }) {
  const admin = initFirebase();

  if (!admin || !isFirebaseEnabled() || !deviceToken) {
    console.log(
      `[push-simulado] userId=${userId} | "${titulo}" -> "${mensaje}" (sin deviceToken o Firebase deshabilitado)`
    );
    return { sent: false, simulated: true };
  }

  try {
    await admin.messaging().send({
      token: deviceToken,
      notification: {
        title: titulo,
        body: mensaje,
      },
      data: {
        userId: String(userId),
      },
    });
    return { sent: true, simulated: false };
  } catch (err) {
    console.error("[firebase] error enviando push:", err.message);
    return { sent: false, simulated: false, error: err.message };
  }
}
