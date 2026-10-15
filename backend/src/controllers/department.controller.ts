import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { createDepartmentSchema } from "@flowpilot/shared";

export const departmentController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const departments = await db.query(
        `SELECT d.*, u.full_name as manager_name 
         FROM departments d 
         LEFT JOIN users u ON u.id = d.manager_user_id 
         WHERE d.organization_id = ? 
         ORDER BY d.name ASC`,
        [req.organizationId]
      );

      return res.json({
        success: true,
        data: departments,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const data = createDepartmentSchema.parse(req.body);

      const deptId = uuidv4();
      await db.execute(
        "INSERT INTO departments (id, organization_id, name, manager_user_id) VALUES (?, ?, ?, ?)",
        [deptId, req.organizationId, data.name, data.managerUserId || null]
      );

      const dept = await db.queryOne("SELECT * FROM departments WHERE id = ?", [deptId]);
      return res.status(201).json({
        success: true,
        data: dept,
      });
    } catch (err) {
      next(err);
    }
  },
};
