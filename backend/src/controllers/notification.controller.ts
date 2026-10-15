import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "User authentication required");

      const notifications = await db.query(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        [req.user.id]
      );

      const unreadCountRow = await db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL",
        [req.user.id]
      );

      return res.json({
        success: true,
        data: notifications.map((n) => ({
          id: n.id,
          organizationId: n.organization_id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          resourceType: n.resource_type,
          resourceId: n.resource_id,
          readAt: n.read_at,
          createdAt: n.created_at,
        })),
        meta: {
          unreadCount: Number(unreadCountRow?.count || 0),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "User authentication required");
      const { notificationId } = req.params;

      await db.execute(
        "UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?",
        [notificationId, req.user.id]
      );

      return res.json({ success: true, data: { id: notificationId, read: true } });
    } catch (err) {
      next(err);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "User authentication required");

      await db.execute(
        "UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL",
        [req.user.id]
      );

      return res.json({ success: true, message: "All notifications marked as read." });
    } catch (err) {
      next(err);
    }
  },
};
