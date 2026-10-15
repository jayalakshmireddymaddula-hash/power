import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { approveDecisionSchema, rejectDecisionSchema, requestChangesDecisionSchema } from "@flowpilot/shared";
import { workflowEngine } from "../workflow-engine/engine.js";
import { evaluateApprovalPolicy } from "../workflow-engine/policy-engine.js";

export const approvalController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const status = (req.query.status as string) || "pending";

      const tasks = await db.query(
        `SELECT at.*, 
                r.title as request_title, r.category as request_category, r.amount_minor, r.currency,
                r.requested_by, u.full_name as requester_name, u.email as requester_email,
                d.name as department_name, dec.full_name as decided_by_name
         FROM approval_tasks at
         JOIN requests r ON r.id = at.request_id
         JOIN users u ON u.id = r.requested_by
         LEFT JOIN departments d ON d.id = r.department_id
         LEFT JOIN users dec ON dec.id = at.decided_by
         WHERE at.organization_id = ? AND at.status = ?
         ORDER BY at.created_at DESC`,
        [req.organizationId, status]
      );

      return res.json({
        success: true,
        data: tasks.map((t) => ({
          id: t.id,
          organizationId: t.organization_id,
          requestId: t.request_id,
          executionId: t.execution_id,
          assignedTo: t.assigned_to,
          requiredRole: t.required_role,
          stage: t.stage,
          status: t.status,
          decisionComment: t.decision_comment,
          decidedBy: t.decided_by,
          decidedByName: t.decided_by_name,
          decidedAt: t.decided_at,
          dueAt: t.due_at,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          requestTitle: t.request_title,
          requestCategory: t.request_category,
          amountMinor: t.amount_minor,
          currency: t.currency,
          requesterName: t.requester_name,
          requesterEmail: t.requester_email,
          departmentName: t.department_name,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { approvalId } = req.params;

      const task = await db.queryOne<{
        id: string;
        organization_id: string;
        request_id: string;
        execution_id: string;
        assigned_to: string | null;
        required_role: string;
        stage: number;
        status: string;
        decision_comment: string | null;
        decided_by: string | null;
        decided_at: string | null;
        due_at: string | null;
        created_at: string;
      }>("SELECT * FROM approval_tasks WHERE id = ? AND organization_id = ?", [approvalId, req.organizationId]);

      if (!task) throw new AppError(404, "NOT_FOUND", "Approval task not found");

      // Fetch request details
      const request = await db.queryOne<{
        id: string;
        title: string;
        category: string;
        description: string;
        business_justification: string;
        amount_minor: number | null;
        currency: string | null;
        requested_by: string;
        department_id: string | null;
      }>("SELECT * FROM requests WHERE id = ?", [task.request_id]);

      // Fetch policy evaluation for advisory summary
      const policy = await evaluateApprovalPolicy(
        req.organizationId,
        request?.category || "procurement",
        request?.amount_minor,
        request?.currency || "INR"
      );

      return res.json({
        success: true,
        data: {
          ...task,
          request,
          policy,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user || !req.member) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required");
      }
      const { approvalId } = req.params;
      const data = approveDecisionSchema.parse(req.body);

      const task = await db.queryOne<{
        id: string;
        organization_id: string;
        request_id: string;
        execution_id: string;
        assigned_to: string | null;
        required_role: string;
        stage: number;
        status: string;
      }>("SELECT * FROM approval_tasks WHERE id = ? AND organization_id = ?", [approvalId, req.organizationId]);

      if (!task) throw new AppError(404, "NOT_FOUND", "Approval task not found");
      if (task.status !== "pending") {
        throw new AppError(409, "ALREADY_DECIDED", `Approval task is already ${task.status}.`);
      }

      // Check self-approval restriction
      const request = await db.queryOne<{
        id: string;
        title: string;
        category: string;
        amount_minor: number | null;
        currency: string | null;
        requested_by: string;
      }>("SELECT * FROM requests WHERE id = ?", [task.request_id]);

      const policy = await evaluateApprovalPolicy(
        req.organizationId,
        request?.category || "procurement",
        request?.amount_minor,
        request?.currency || "INR"
      );

      if (request?.requested_by === req.user.id && !policy.allowSelfApproval) {
        throw new AppError(
          403,
          "SELF_APPROVAL_PROHIBITED",
          "Organizational policy strictly prohibits approving your own purchase request."
        );
      }

      // Verify role authorization
      const allowedRoles = ["owner", "admin", task.required_role];
      if (!allowedRoles.includes(req.member.role)) {
        throw new AppError(
          403,
          "INSUFFICIENT_ROLE",
          `Role '${req.member.role}' cannot approve tasks requiring '${task.required_role}'.`
        );
      }

      // Update current approval task to approved
      await db.execute(
        `UPDATE approval_tasks 
         SET status = 'approved', decision_comment = ?, decided_by = ?, decided_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        [data.comment || "Approved", req.user.id, approvalId]
      );

      // Audit event
      await db.execute(
        `INSERT INTO audit_events (id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, metadata)
         VALUES (?, ?, ?, 'user', 'approval.decision', 'approval_task', ?, ?)`,
        [uuidv4(), req.organizationId, req.user.id, task.request_id, JSON.stringify({ approvalId, stage: task.stage, decision: "approved", comment: data.comment })]
      );

      // Check if sequential next stage is required
      const nextStageNumber = task.stage + 1;
      const nextStageConfig = policy.stages.find((s) => s.stageNumber === nextStageNumber);

      if (nextStageConfig) {
        // Multi-stage sequential approval required! Create Stage 2 task
        const nextTaskId = uuidv4();
        const dueAt = new Date(Date.now() + nextStageConfig.timeoutHours * 3600 * 1000).toISOString();

        // Find eligible approver for stage 2 (e.g. admin or finance)
        const stage2Approver = await db.queryOne<{ user_id: string }>(
          `SELECT user_id FROM organization_members 
           WHERE organization_id = ? AND status = 'active' AND (role = ? OR role = 'owner' OR role = 'admin')
           AND user_id != ?
           ORDER BY role = 'admin' DESC LIMIT 1`,
          [req.organizationId, nextStageConfig.requiredRole, request?.requested_by || ""]
        );

        await db.execute(
          `INSERT INTO approval_tasks (id, organization_id, request_id, execution_id, assigned_to, required_role, stage, status, due_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [nextTaskId, req.organizationId, task.request_id, task.execution_id, stage2Approver?.user_id || null, nextStageConfig.requiredRole, nextStageNumber, dueAt]
        );

        if (stage2Approver) {
          await db.execute(
            `INSERT INTO notifications (id, organization_id, user_id, type, title, message, resource_type, resource_id)
             VALUES (?, ?, ?, 'approval_required', 'Secondary Approval Required', ?, 'approval', ?)`,
            [uuidv4(), req.organizationId, stage2Approver.user_id, `Request '${request?.title}' has passed Stage 1 and requires your Stage 2 review.`, nextTaskId]
          );
        }

        return res.json({
          success: true,
          data: {
            approvalId,
            status: "approved",
            nextStageCreated: true,
            nextStage: nextStageNumber,
            message: `Stage ${task.stage} approved. Stage ${nextStageNumber} (${nextStageConfig.name}) initiated.`,
          },
        });
      }

      // Final stage approval: Update request status and resume workflow!
      await db.execute(
        "UPDATE requests SET status = 'approved', updated_at = datetime('now') WHERE id = ?",
        [task.request_id]
      );

      // Resume execution
      await workflowEngine.resumeExecution({
        executionId: task.execution_id,
        approved: true,
        decisionComment: data.comment,
        decidedBy: req.user.id,
      });

      // Send notification to requester
      if (request?.requested_by) {
        await db.execute(
          `INSERT INTO notifications (id, organization_id, user_id, type, title, message, resource_type, resource_id)
           VALUES (?, ?, ?, 'approval_completed', 'Request Approved', ?, 'request', ?)`,
          [uuidv4(), req.organizationId, request.requested_by, `Your purchase request '${request.title}' has been officially approved.`, task.request_id]
        );
      }

      return res.json({
        success: true,
        data: {
          approvalId,
          status: "approved",
          nextStageCreated: false,
          message: "Approval completed and workflow resumed successfully.",
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
      const { approvalId } = req.params;
      const data = rejectDecisionSchema.parse(req.body);

      const task = await db.queryOne<{
        id: string;
        organization_id: string;
        request_id: string;
        execution_id: string;
        status: string;
      }>("SELECT * FROM approval_tasks WHERE id = ? AND organization_id = ?", [approvalId, req.organizationId]);

      if (!task) throw new AppError(404, "NOT_FOUND", "Approval task not found");
      if (task.status !== "pending") throw new AppError(409, "ALREADY_DECIDED", "Task is already decided.");

      await db.execute(
        `UPDATE approval_tasks 
         SET status = 'rejected', decision_comment = ?, decided_by = ?, decided_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        [data.comment, req.user.id, approvalId]
      );

      // Resume workflow with rejection
      await workflowEngine.resumeExecution({
        executionId: task.execution_id,
        approved: false,
        decisionComment: data.comment,
        decidedBy: req.user.id,
      });

      // Notify requester
      const request = await db.queryOne<{ requested_by: string; title: string }>(
        "SELECT requested_by, title FROM requests WHERE id = ?",
        [task.request_id]
      );
      if (request?.requested_by) {
        await db.execute(
          `INSERT INTO notifications (id, organization_id, user_id, type, title, message, resource_type, resource_id)
           VALUES (?, ?, ?, 'request_rejected', 'Request Rejected', ?, 'request', ?)`,
          [uuidv4(), req.organizationId, request.requested_by, `Request '${request.title}' was rejected: ${data.comment}`, task.request_id]
        );
      }

      return res.json({
        success: true,
        data: { approvalId, status: "rejected" },
      });
    } catch (err) {
      next(err);
    }
  },

  async requestChanges(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
      const { approvalId } = req.params;
      const data = requestChangesDecisionSchema.parse(req.body);

      const task = await db.queryOne<{
        id: string;
        organization_id: string;
        request_id: string;
        execution_id: string;
        status: string;
      }>("SELECT * FROM approval_tasks WHERE id = ? AND organization_id = ?", [approvalId, req.organizationId]);

      if (!task) throw new AppError(404, "NOT_FOUND", "Approval task not found");

      await db.execute(
        `UPDATE approval_tasks 
         SET status = 'changes_requested', decision_comment = ?, decided_by = ?, decided_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        [data.comment, req.user.id, approvalId]
      );

      await db.execute(
        "UPDATE requests SET status = 'changes_requested', updated_at = datetime('now') WHERE id = ?",
        [task.request_id]
      );

      // Notify requester
      const request = await db.queryOne<{ requested_by: string; title: string }>(
        "SELECT requested_by, title FROM requests WHERE id = ?",
        [task.request_id]
      );
      if (request?.requested_by) {
        await db.execute(
          `INSERT INTO notifications (id, organization_id, user_id, type, title, message, resource_type, resource_id)
           VALUES (?, ?, ?, 'changes_requested', 'Changes Requested on Request', ?, 'request', ?)`,
          [uuidv4(), req.organizationId, request.requested_by, `Changes requested for '${request.title}': ${data.comment}`, task.request_id]
        );
      }

      return res.json({
        success: true,
        data: { approvalId, status: "changes_requested" },
      });
    } catch (err) {
      next(err);
    }
  },
};
