import { Notification } from "../models/Notification.js";

export const NotificationRepository = {
  async create(data) {
    return Notification.create(data);
  },

  async findAll({ limit = 50, skip = 0 } = {}) {
    return Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
  },

  async findByUser(userId, { limit = 50, skip = 0 } = {}) {
    return Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  },

  async findById(id) {
    return Notification.findById(id);
  },

  async updateEstado(id, estado) {
    return Notification.findByIdAndUpdate(id, { estado }, { new: true });
  },

  async deleteById(id) {
    return Notification.findByIdAndDelete(id);
  },
};
