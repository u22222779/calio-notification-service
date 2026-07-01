import {
  sendNotification,
  listAll,
  listByUser,
  removeById,
} from "../services/notificationService.js";

export const NotificationController = {
  // POST /notify
  async notify(c) {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error:
            "El body debe ser JSON válido. Verifica que enviaste Content-Type: application/json y un body no vacío.",
        },
        400
      );
    }

    try {
      const { notification, push } = await sendNotification({
        userId: body.userId,
        titulo: body.titulo,
        mensaje: body.mensaje,
        tipo: body.tipo,
        deviceToken: body.deviceToken,
        origen: "http",
      });

      return c.json(
        {
          status: notification.estado === "ENVIADO" ? "sent" : "failed",
          notification,
          push,
        },
        notification.estado === "ENVIADO" ? 201 : 502
      );
    } catch (err) {
      return c.json({ error: err.message }, err.status || 500);
    }
  },

  // GET /notifications
  async getAll(c) {
    try {
      const limit = Number(c.req.query("limit") || 50);
      const skip = Number(c.req.query("skip") || 0);
      const notifications = await listAll({ limit, skip });
      return c.json(notifications);
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  },

  // GET /notifications/:userId
  async getByUser(c) {
    try {
      const userId = Number(c.req.param("userId"));
      const limit = Number(c.req.query("limit") || 50);
      const skip = Number(c.req.query("skip") || 0);
      const notifications = await listByUser(userId, { limit, skip });
      return c.json(notifications);
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  },

  // DELETE /notifications/:id
  async remove(c) {
    try {
      const id = c.req.param("id");
      const deleted = await removeById(id);
      if (!deleted) return c.json({ error: "Notificación no encontrada" }, 404);
      return c.json({ status: "deleted", id });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  },
};