# S-07 Notification Service — Calio

Microservicio responsable de **notificar** a los usuarios cuando ocurre algo
importante en el ecosistema Calio. Sigue el principio de responsabilidad
única: **no calcula calorías, no guarda comidas y no genera estadísticas.**
Solo recibe eventos, los procesa, envía la notificación y guarda un
historial.

> ✅ Este servicio fue probado end-to-end: conexión a MongoDB, conexión a
> RabbitMQ, envío manual vía HTTP, consumo automático de eventos, y
> verificación del historial guardado. Todo funcionando correctamente.

---

## Stack

| Componente    | Tecnología                           |
|---------------|---------------------------------------|
| Framework     | Hono                                  |
| Lenguaje      | JavaScript (ESM)                      |
| Base de datos | MongoDB                               |
| Mensajería    | RabbitMQ                              |
| Push          | Firebase Cloud Messaging (opcional)   |
| Scheduler     | node-cron                             |
| Puerto        | 8087                                  |

## Estructura del proyecto

```
notification-service/
├── server.js                          # Punto de entrada
├── src/
│   ├── config/
│   │   ├── mongo.js                   # Conexión a MongoDB
│   │   ├── rabbitmq.js                # Conexión, exchange y binding de colas
│   │   └── firebase.js                # Inicialización de Firebase Admin SDK
│   ├── controllers/
│   │   └── notificationController.js  # Maneja las peticiones HTTP
│   ├── routes/
│   │   └── notificationRoutes.js      # Definición de endpoints
│   ├── services/
│   │   ├── notificationService.js     # Lógica de negocio central
│   │   └── pushService.js             # Envío de push (real o simulado)
│   ├── models/
│   │   ├── Notification.js            # Esquema Mongoose
│   │   └── notificationRepository.js  # Acceso a datos
│   ├── consumers/
│   │   └── rabbitConsumer.js          # Escucha eventos de otros microservicios
│   ├── schedulers/
│   │   └── scheduler.js               # Notificaciones programadas (cron)
│   └── middlewares/
│       └── logger.js                  # Log de cada request HTTP
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

Cada capa tiene una única responsabilidad: **Routes** define endpoints,
**Controller** recibe y delega, **Service** contiene la lógica de negocio,
**Consumer** escucha eventos asíncronos, **Repository** habla con Mongo, y
**Scheduler** dispara recordatorios por hora.

---

## Requisitos previos

- **Node.js** 18 o superior
- **Docker Desktop** (recomendado, para levantar MongoDB y RabbitMQ sin
  instalarlos manualmente)

### Si estás en Windows y no tienes Docker

Docker Desktop en Windows requiere **WSL2**. Si el comando `docker` no se
reconoce o Docker Desktop no arranca, sigue esto antes de continuar:

1. Abre PowerShell **como administrador** y ejecuta:
   ```powershell
   wsl --install
   ```
2. Reinicia la PC.
3. Al reiniciar, completa la configuración inicial de Ubuntu (usuario y
   contraseña de Linux, puede ser cualquiera).
4. Instala Docker Desktop desde https://www.docker.com/products/docker-desktop/
   (elige "Descargar para Windows – AMD64" para la mayoría de PCs).
5. Abre Docker Desktop y espera a que la esquina inferior izquierda diga
   **"Engine running"**.
6. Confirma que todo quedó bien:
   ```powershell
   docker run hello-world
   ```
   Debe mostrar `"Hello from Docker!"`.

---

## 1. Instalación

```bash
cd notification-service
npm install
cp .env.ejemplo .env
```

Revisa tu `.env` y confirma que `RABBITMQ_URL` coincide con las credenciales
definidas en `docker-compose.yml` (`calio` / `calio123` por defecto). Si no
coinciden, la conexión a RabbitMQ falla con un error de autenticación
(`403 ACCESS-REFUSED`).

## 2. Levantar dependencias (MongoDB + RabbitMQ)

Crea primero la red compartida del proyecto Calio (si no existe ya):

```bash
docker network create calio-network
```

Luego levanta los contenedores necesarios:

```bash
docker compose up -d rabbitmq
```

> Si ya tienes MongoDB instalado localmente en Windows (puerto 27017), no
> necesitas levantar `notification-db` del compose — el servicio se conecta
> directo a tu instancia local. Si prefieres usar el Mongo del
> docker-compose, corre `docker compose up -d notification-db rabbitmq` y
> ajusta `MONGO_URI` en `.env` al puerto que expone ese contenedor.

Verifica que quedaron corriendo:

```bash
docker ps
```

RabbitMQ expone un panel de administración web en **http://localhost:15672**
(usuario `calio`, contraseña `calio123`), útil para publicar eventos de
prueba manualmente.

## 3. Correr el servicio

```bash
npm run dev     # con auto-reload (node --watch)
# o
npm start
```

Salida esperada cuando todo está bien conectado:

```
[mongo] conectado -> mongodb://localhost:27017/calio_notifications
[rabbitmq] conectado, exchange="calio.events" queue="notification.queue"
[rabbitmq] consumidor escuchando en "notification.queue"...
[cron] schedulers programados (08:00, 12:30, 15:00, 20:00)
🔔 notification-service escuchando en http://localhost:8087
```

> Si RabbitMQ no está disponible, el servicio **no se cae**: solo el
> consumidor de eventos queda inactivo, y el resto (HTTP, Mongo, cron) sigue
> funcionando con normalidad.

---

## 4. Endpoints HTTP

| Método | Ruta                      | Descripción                |
|--------|---------------------------|------------------------------|
| GET    | `/health`                 | Health check                |
| POST   | `/notify`                 | Enviar una notificación     |
| GET    | `/notifications`          | Listar todas (paginado)     |
| GET    | `/notifications/:userId`  | Listar por usuario          |
| DELETE | `/notifications/:id`      | Eliminar una notificación   |

### Ejemplo `POST /notify`

**PowerShell (Windows):**

```powershell
$body = @{
    userId  = 5
    titulo  = "Excelente"
    mensaje = "Terminaste tu meta"
    tipo    = "motivacional"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8087/notify" -Method POST -ContentType "application/json" -Body $body
```

**curl (Linux/macOS/Git Bash):**

```bash
curl -X POST http://localhost:8087/notify \
  -H "Content-Type: application/json" \
  -d '{"userId": 5, "titulo": "Excelente", "mensaje": "Terminaste tu meta", "tipo": "motivacional"}'
```

Respuesta:

```json
{
  "status": "sent",
  "notification": {
    "_id": "6a445737db91c833459d0901",
    "userId": 5,
    "titulo": "Excelente",
    "mensaje": "Terminaste tu meta",
    "tipo": "motivacional",
    "estado": "ENVIADO",
    "origen": "http",
    "fecha": "2026-07-01"
  },
  "push": { "sent": false, "simulated": true }
}
```

> Si `FIREBASE_ENABLED=false` (valor por defecto), el push se "simula": queda
> registrado en consola y en MongoDB como `ENVIADO`, pero no llega un push
> real al celular. Para activarlo de verdad, configura
> `FIREBASE_SERVICE_ACCOUNT_PATH` con tu credencial de Firebase y pon
> `FIREBASE_ENABLED=true`.

### Otros ejemplos

```powershell
# Listar todas las notificaciones
Invoke-RestMethod -Uri "http://localhost:8087/notifications"

# Listar por usuario
Invoke-RestMethod -Uri "http://localhost:8087/notifications/5"

# Eliminar una notificación
Invoke-RestMethod -Uri "http://localhost:8087/notifications/<id>" -Method DELETE

# Health check
Invoke-RestMethod -Uri "http://localhost:8087/health"
```

---

## 5. Eventos que escucha por RabbitMQ

El servicio se suscribe (vía exchange `calio.events`, tipo `topic`) a estas
routing keys:

```
logro.alcanzado
plan.generado
peso.actualizado
calorias.excedidas
agua.recordatorio
mantenimiento
racha.detectada
comida.registrada
```

Cualquier otro microservicio (Tracking, Analytics, etc.) publica así:

```js
channel.publish(
  "calio.events",
  "racha.detectada",
  Buffer.from(JSON.stringify({ userId: 50, dias: 7 }))
);
```

Notification lo recibe, decide el mensaje correspondiente
(`buildMessageFromEvent` en `notificationService.js`), envía el push y guarda
el historial — exactamente el mismo flujo que usa `POST /notify`.

### Probar un evento manualmente (sin tener otro microservicio corriendo)

1. Abre **http://localhost:15672** (usuario `calio`, contraseña `calio123`).
2. Ve a la pestaña **Exchanges** → `calio.events`.
3. En "Publish message", completa:
   - **Routing key**: `racha.detectada`
   - **Payload**: `{"userId": 99, "dias": 7}`
4. Clic en **Publish message**.

En la consola del servicio deberías ver, sin haber llamado `/notify` a mano:

```
[rabbitmq] evento recibido: "racha.detectada" -> { userId: 99, dias: 7 }
[push-simulado] userId=99 | "🔥 ¡Increíble!" -> "Llevas 7 días seguidos cumpliendo tus metas."
[http] GET /notifications/99 -> 200
```

Y `GET /notifications/99` mostrará la notificación con
`"origen": "event:racha.detectada"`, confirmando que fue generada
automáticamente por el evento y no por una llamada manual.

---

## 6. Notificaciones programadas (cron)

| Hora  | Notificación              |
|-------|----------------------------|
| 08:00 | Recordar desayuno          |
| 12:30 | Recordar almuerzo          |
| 15:00 | Recordatorio de agua       |
| 20:00 | Recordar actualizar peso   |

Por ahora, `getUsuariosActivos()` en `src/schedulers/scheduler.js` es un
placeholder: toma los `userId` que ya tienen notificaciones en Mongo. Cuando
el Identity/Tracking Service esté disponible, se reemplaza esa función por
una llamada real para saber a quién corresponde notificar.

---

## 7. Solución de problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Unexpected end of JSON input` en `/notify` | El body llegó vacío o mal formado | Usa `ConvertTo-Json` en PowerShell o revisa el `Content-Type: application/json` |
| `403 ACCESS-REFUSED` al conectar a RabbitMQ | Las credenciales en `.env` no coinciden con las del contenedor | Confirma que `RABBITMQ_URL` use `calio:calio123`, igual que en `docker-compose.yml` |
| `EADDRINUSE :::8087` | Ya hay otra instancia del servicio corriendo | Cierra la otra terminal, o mata el proceso: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8087).OwningProcess \| Stop-Process -Force` |
| `[rabbitmq] no se pudo conectar` | RabbitMQ no está corriendo | `docker ps` para verificar, o `docker compose up -d rabbitmq` |
| `docker: command not found` / falla el daemon | Docker Desktop no instalado o no iniciado, o falta WSL2 | Ver sección "Requisitos previos" |

---

## 8. Próximos pasos sugeridos

1. Conectar credenciales reales de Firebase para push real (`FIREBASE_ENABLED=true`).
2. Reemplazar el placeholder de usuarios activos por una consulta real a
   Identity/Tracking.
3. Agregar autenticación (JWT) en las rutas si el Gateway no la valida antes
   de reenviar la petición.
4. Agregar tests unitarios para `notificationService.js`.
5. Integrar con Tracking y Analytics reales para probar el flujo completo de
   punta a punta en el ecosistema Calio.