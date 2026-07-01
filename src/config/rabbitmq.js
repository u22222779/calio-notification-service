import amqp from "amqplib";

let connection = null;
let channel = null;

const EXCHANGE = process.env.RABBITMQ_EXCHANGE || "calio.events";
const QUEUE = process.env.RABBITMQ_QUEUE || "notification.queue";

/**
 * Eventos que el Notification Service escucha de otros microservicios.
 * Cada uno se enruta con su propia routing key dentro del exchange "calio.events".
 */
export const ROUTING_KEYS = [
  "logro.alcanzado",
  "plan.generado",
  "peso.actualizado",
  "calorias.excedidas",
  "agua.recordatorio",
  "mantenimiento",
  "racha.detectada",
  "comida.registrada",
];

/**
 * Crea (si no existe) la conexión y el canal de RabbitMQ.
 * Declara el exchange tipo "topic" y la cola, y las bindea
 * a cada routing key relevante para Notification.
 */
export async function getRabbitChannel() {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

  connection = await amqp.connect(url);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });

  for (const key of ROUTING_KEYS) {
    await channel.bindQueue(QUEUE, EXCHANGE, key);
  }

  connection.on("close", () => {
    console.warn("[rabbitmq] conexión cerrada");
    channel = null;
    connection = null;
  });

  connection.on("error", (err) => {
    console.error("[rabbitmq] error:", err.message);
  });

  console.log(`[rabbitmq] conectado, exchange="${EXCHANGE}" queue="${QUEUE}"`);
  return channel;
}

export function getExchangeName() {
  return EXCHANGE;
}

export function getQueueName() {
  return QUEUE;
}
