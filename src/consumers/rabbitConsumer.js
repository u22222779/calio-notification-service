import { getRabbitChannel, getQueueName } from "../config/rabbitmq.js";
import { sendNotification, buildMessageFromEvent } from "../services/notificationService.js";

/**
 * Arranca el consumidor de la cola "notification.queue".
 * Por cada evento publicado por otro microservicio (Tracking, Analytics, etc.)
 * decide si genera una notificación y, si aplica, ejecuta el mismo flujo
 * sendNotification() que usa el endpoint HTTP POST /notify.
 */
export async function startNotificationConsumer() {
  const channel = await getRabbitChannel();
  const queue = getQueueName();

  channel.prefetch(10);

  console.log(`[rabbitmq] consumidor escuchando en "${queue}"...`);

  channel.consume(
    queue,
    async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        const evento = msg.fields.routingKey;

        console.log(`[rabbitmq] evento recibido: "${evento}" ->`, payload);

        const built = buildMessageFromEvent(evento, payload);

        if (!built) {
          console.warn(`[rabbitmq] evento "${evento}" sin mapeo de notificación, se ignora`);
          channel.ack(msg);
          return;
        }

        await sendNotification({
          userId: payload.userId,
          titulo: built.titulo,
          mensaje: built.mensaje,
          tipo: built.tipo,
          deviceToken: payload.deviceToken,
          origen: `event:${evento}`,
        });

        // Confirmar a RabbitMQ que el mensaje se procesó correctamente
        channel.ack(msg);
      } catch (err) {
        console.error("[rabbitmq] error procesando mensaje:", err.message);
        // requeue=false para no reintentar infinito si el mensaje está malformado
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}
