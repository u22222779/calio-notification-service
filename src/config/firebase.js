import admin from "firebase-admin";
import fs from "fs";

let initialized = false;

/**
 * Inicializa Firebase Admin SDK solo si:
 *  - FIREBASE_ENABLED=true
 *  - el archivo de credenciales existe
 *
 * Si no está configurado, el servicio sigue funcionando en modo
 * "simulado": no falla, solo deja de enviar push reales.
 */
export function initFirebase() {
  if (initialized) return admin;

  const enabled = process.env.FIREBASE_ENABLED === "true";
  const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!enabled) {
    console.warn("[firebase] deshabilitado (FIREBASE_ENABLED=false) -> modo simulado");
    return null;
  }

  if (!credPath || !fs.existsSync(credPath)) {
    console.warn(`[firebase] no se encontró el archivo de credenciales (${credPath}) -> modo simulado`);
    return null;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  console.log("[firebase] inicializado correctamente");
  return admin;
}

export function isFirebaseEnabled() {
  return initialized;
}
