import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { workflowEngine } from "../workflow-engine/engine.js";

export const demoController = {
  async seed(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const orgId = req.organizationId;
      const userId = req.user.id;

      // 1. Fetch departments
      const engDept = await db.queryOne<{ id: string }>(
        "SELECT id FROM departments WHERE organization_id = ? AND name LIKE '%Engineering%' LIMIT 1",
        [orgId]
      );
      const finDept = await db.queryOne<{ id: string }>(
        "SELECT id FROM departments WHERE organization_id = ? AND name LIKE '%Finance%' LIMIT 1",
        [orgId]
      );

      // 2. Fetch purchase workflow
      const workflow = await db.queryOne<{ id: string }>(
        "SELECT id FROM workflows WHERE organization_id = ? AND category = 'procurement' LIMIT 1",
        [orgId]
      );

      // Create Sample Request 1: High Value (₹2,10,000 -> 21000000 paise) requiring 2-stage approval
      const reqId1 = uuidv4();
      await db.execute(
        `INSERT INTO requests (
          id, organization_id, title, category, description, business_justification,
          amount_minor, currency, department_id, priority, status, requested_by
        ) VALUES (?, ?, 'High-Performance GPU Workstations (x2)', 'procurement',
          'Two Dell Precision 7680 mobile workstations with NVIDIA RTX 5000 Ada GPUs for LLM inference testing.',
          'Critical computing hardware for the AI core research team to run model fine-tuning locally.',
          21000000, 'INR', ?, 'high', 'awaiting_approval', ?)`,
        [reqId1, orgId, engDept?.id || null, userId]
      );

      if (workflow) {
        await workflowEngine.startExecution({
          workflowId: workflow.id,
          organizationId: orgId,
          triggeredBy: userId,
          triggerType: "demo_seed",
          requestId: reqId1,
          inputData: {
            requestId: reqId1,
            title: "High-Performance GPU Workstations (x2)",
            category: "procurement",
            amountMinor: 21000000,
            currency: "INR",
          },
        });
      }

      // Create Sample Request 2: Mid Value (₹18,500 -> 1850000 paise) for department manager approval
      const reqId2 = uuidv4();
      await db.execute(
        `INSERT INTO requests (
          id, organization_id, title, category, description, business_justification,
          amount_minor, currency, department_id, priority, status, requested_by
        ) VALUES (?, ?, 'Figma Enterprise Annual Team Licenses', 'procurement',
          'Annual renewal for 5 UI/UX design seats on Figma Enterprise plan.',
          'Necessary design tooling for the product team design system revamp.',
          1850000, 'INR', ?, 'normal', 'awaiting_approval', ?)`,
        [reqId2, orgId, engDept?.id || null, userId]
      );

      if (workflow) {
        await workflowEngine.startExecution({
          workflowId: workflow.id,
          organizationId: orgId,
          triggeredBy: userId,
          triggerType: "demo_seed",
          requestId: reqId2,
          inputData: {
            requestId: reqId2,
            title: "Figma Enterprise Annual Team Licenses",
            category: "procurement",
            amountMinor: 1850000,
            currency: "INR",
          },
        });
      }

      // Create Sample Request 3: Low Value (₹4,200 -> 420000 paise) already completed
      const reqId3 = uuidv4();
      await db.execute(
        `INSERT INTO requests (
          id, organization_id, title, category, description, business_justification,
          amount_minor, currency, department_id, priority, status, requested_by
        ) VALUES (?, ?, 'Ergonomic Vertical Mouse & Wrist Rest', 'procurement',
          'Logitech MX Vertical mouse and memory foam wrist rests.',
          'Occupational health recommendation for developer workstation.',
          420000, 'INR', ?, 'low', 'approved', ?)`,
        [reqId3, orgId, engDept?.id || null, userId]
      );

      // Create Sample Operational Tasks
      await db.execute(
        `INSERT INTO tasks (id, organization_id, title, description, assigned_to, priority, status, due_at)
         VALUES (?, ?, 'Quarterly AWS Cloud Infrastructure Spend Audit', 'Review RDS and EC2 reserved instances for underutilization.', ?, 'high', 'pending', datetime('now', '+2 days'))`,
        [uuidv4(), orgId, userId]
      );

      await db.execute(
        `INSERT INTO tasks (id, organization_id, title, description, assigned_to, priority, status, due_at)
         VALUES (?, ?, 'Update Vendor Compliance Certificates', 'Request updated SOC-2 and ISO certifications from critical suppliers.', ?, 'normal', 'in_progress', datetime('now', '+5 days'))`,
        [uuidv4(), orgId, userId]
      );

      // Create Sample Notifications
      await db.execute(
        `INSERT INTO notifications (id, organization_id, user_id, type, title, message)
         VALUES (?, ?, ?, 'approval_required', 'Action Required: High-Performance GPU Workstations', 'A purchase request of ₹2,10,000 is awaiting your review.')`,
        [uuidv4(), orgId, userId]
      );

      return res.json({
        success: true,
        message: "Successfully seeded demonstration requests, multi-tier approvals, tasks, and notification feeds.",
      });
    } catch (err) {
      next(err);
    }
  },

  async reset(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const orgId = req.organizationId;
      await db.execute("DELETE FROM approval_tasks WHERE organization_id = ?", [orgId]);
      await db.execute("DELETE FROM execution_steps WHERE organization_id = ?", [orgId]);
      await db.execute("DELETE FROM workflow_executions WHERE organization_id = ?", [orgId]);
      await db.execute("DELETE FROM requests WHERE organization_id = ?", [orgId]);
      await db.execute("DELETE FROM tasks WHERE organization_id = ?", [orgId]);
      await db.execute("DELETE FROM notifications WHERE organization_id = ?", [orgId]);

      return res.json({
        success: true,
        message: "Organization demonstration records have been reset.",
      });
    } catch (err) {
      next(err);
    }
  },
};
