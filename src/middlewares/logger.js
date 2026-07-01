/**
 * Middleware global de captura de errores no manejados.
 * Hono ya tiene su propio app.onError, pero dejamos este helper
 * por si se quiere reutilizar lógica de logging central.
 */
export function logRequest() {
  return async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[http] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`);
  };
}
