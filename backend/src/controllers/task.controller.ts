import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { createTaskSchema, updateTaskSchema } from "@flowpilot/shared";

export const taskController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const status = req.query.status as string | undefined;
      const conditions: string[] = ["t.organization_id = ?"];
      const args: any[] = [req.organizationId];

      if (status) {
        conditions.push("t.status = ?");
        args.push(status);
      }

      const tasks = await db.query(
        `SELECT t.*, u.full_name as assigned_to_name, creator.full_name as created_by_name
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assigned_to
         LEFT JOIN users creator ON creator.id = t.created_by
         WHERE ${conditions.join(" AND ")}
         ORDER BY t.created_at DESC`,
        args
      );

      return res.json({
        success: true,
        data: tasks.map((t) => ({
          id: t.id,
          organizationId: t.organization_id,
          executionId: t.execution_id,
          title: t.title,
          description: t.description,
          assignedTo: t.assigned_to,
          assignedToName: t.assigned_to_name,
          createdBy: t.created_by,
          createdByName: t.created_by_name,
          priority: t.priority,
          status: t.status,
          dueAt: t.due_at,
          completedAt: t.completed_at,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const data = createTaskSchema.parse(req.body);

      const taskId = uuidv4();
      await db.execute(
        `INSERT INTO tasks (id, organization_id, execution_id, title, description, assigned_to, created_by, priority, status, due_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [taskId, req.organizationId, data.executionId || null, data.title, data.description || "", data.assignedTo || null, req.user.id, data.priority, data.dueAt || null]
      );

      const created = await db.queryOne("SELECT * FROM tasks WHERE id = ?", [taskId]);
      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { taskId } = req.params;
      const data = updateTaskSchema.parse(req.body);

      const updates: string[] = [];
      const args: any[] = [];

      if (data.title) {
        updates.push("title = ?");
        args.push(data.title);
      }
      if (data.description !== undefined) {
        updates.push("description = ?");
        args.push(data.description);
      }
      if (data.assignedTo !== undefined) {
        updates.push("assigned_to = ?");
        args.push(data.assignedTo);
      }
      if (data.priority) {
        updates.push("priority = ?");
        args.push(data.priority);
      }
      if (data.status) {
        updates.push("status = ?");
        args.push(data.status);
        if (data.status === "completed") {
          updates.push("completed_at = datetime('now')");
        }
      }
      if (data.dueAt !== undefined) {
        updates.push("due_at = ?");
        args.push(data.dueAt);
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        args.push(taskId, req.organizationId);
        await db.execute(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND organization_id = ?`, args);
      }

      const updated = await db.queryOne("SELECT * FROM tasks WHERE id = ?", [taskId]);
      return res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { taskId } = req.params;

      await db.execute(
        "UPDATE tasks SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND organization_id = ?",
        [taskId, req.organizationId]
      );

      return res.json({
        success: true,
        data: { id: taskId, status: "completed" },
      });
    } catch (err) {
      next(err);
    }
  },
};
