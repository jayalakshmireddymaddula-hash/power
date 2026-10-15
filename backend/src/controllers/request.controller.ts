import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { createRequestSchema, updateRequestSchema, paginationQuerySchema } from "@flowpilot/shared";
import { workflowEngine } from "../workflow-engine/engine.js";
import { evaluateApprovalPolicy } from "../workflow-engine/policy-engine.js";

export const requestController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const query = paginationQuerySchema.parse(req.query);
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;

      const conditions: string[] = ["r.organization_id = ?"];
      const args: any[] = [req.organizationId];

      if (category) {
        conditions.push("r.category = ?");
        args.push(category);
      }
      if (status) {
        conditions.push("r.status = ?");
        args.push(status);
      }
      if (priority) {
        conditions.push("r.priority = ?");
        args.push(priority);
      }
      if (query.search) {
        conditions.push("(r.title LIKE ? OR r.description LIKE ?)");
        args.push(`%${query.search}%`, `%${query.search}%`);
      }

      const whereClause = conditions.join(" AND ");

      const totalResult = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM requests r WHERE ${whereClause}`,
        args
      );
      const total = Number(totalResult?.count || 0);

      const offset = (query.page - 1) * query.limit;
      const requests = await db.query(
        `SELECT r.*, u.full_name as requester_name, u.email as requester_email, d.name as department_name 
         FROM requests r 
         LEFT JOIN users u ON u.id = r.requested_by 
         LEFT JOIN departments d ON d.id = r.department_id 
         WHERE ${whereClause} 
         ORDER BY r.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...args, query.limit, offset]
      );

      return res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          organizationId: r.organization_id,
          requestNumber: r.request_number,
          title: r.title,
          category: r.category,
          description: r.description,
          businessJustification: r.business_justification,
          amountMinor: r.amount_minor,
          currency: r.currency,
          departmentId: r.department_id,
          departmentName: r.department_name,
          priority: r.priority,
          status: r.status,
          requestedBy: r.requested_by,
          requesterName: r.requester_name,
          requesterEmail: r.requester_email,
          neededBy: r.needed_by,
          metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
          idempotencyKey: r.idempotency_key,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const data = createRequestSchema.parse(req.body);

      // Idempotency check
      if (data.idempotencyKey) {
        const existing = await db.queryOne<{ id: string }>(
          "SELECT id FROM requests WHERE organization_id = ? AND requested_by = ? AND idempotency_key = ?",
          [req.organizationId, req.user.id, data.idempotencyKey]
        );
        if (existing) {
          const reqDetails = await requestController.getRequestDetailsById(existing.id, req.organizationId);
          return res.json({ success: true, data: reqDetails });
        }
      }

      const requestId = uuidv4();

      // Insert request row
      await db.execute(
        `INSERT INTO requests (
          id, organization_id, request_number, title, category, description, business_justification,
          amount_minor, currency, department_id, priority, status, requested_by,
          needed_by, metadata, idempotency_key
        ) VALUES (?, ?, (SELECT COALESCE(MAX(request_number), 1000) + 1 FROM requests WHERE organization_id = ?), ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?)`,
        [
          requestId,
          req.organizationId,
          req.organizationId,
          data.title,
          data.category,
          data.description,
          data.businessJustification,
          data.amountMinor || null,
          data.currency || null,
          data.departmentId || null,
          data.priority,
          req.user.id,
          data.neededBy || null,
          JSON.stringify(data.metadata || {}),
          data.idempotencyKey || null,
        ]
      );

      // Audit event
      await db.execute(
        `INSERT INTO audit_events (id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, metadata)
         VALUES (?, ?, ?, 'user', 'request.created', 'request', ?, ?)`,
        [uuidv4(), req.organizationId, req.user.id, requestId, JSON.stringify({ title: data.title, category: data.category, amountMinor: data.amountMinor })]
      );

      // Evaluate deterministic policy
      const policyResult = await evaluateApprovalPolicy(
        req.organizationId,
        data.category,
        data.amountMinor,
        data.currency || "INR"
      );

      // Look up active workflow for this category
      let workflow = await db.queryOne<{ id: string }>(
        "SELECT id FROM workflows WHERE organization_id = ? AND category = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1",
        [req.organizationId, data.category]
      );

      if (!workflow) {
        // Fallback to procurement workflow template
        workflow = await db.queryOne<{ id: string }>(
          "SELECT id FROM workflows WHERE organization_id = ? AND status = 'active' LIMIT 1",
          [req.organizationId]
        );
      }

      let executionInfo: any = null;
      if (workflow) {
        executionInfo = await workflowEngine.startExecution({
          workflowId: workflow.id,
          organizationId: req.organizationId,
          triggeredBy: req.user.id,
          triggerType: "request_submitted",
          requestId,
          inputData: {
            requestId,
            title: data.title,
            category: data.category,
            description: data.description,
            businessJustification: data.businessJustification,
            amountMinor: data.amountMinor,
            currency: data.currency,
            departmentId: data.departmentId,
            priority: data.priority,
          },
        });
      }

      const created = await requestController.getRequestDetailsById(requestId, req.organizationId);

      return res.status(201).json({
        success: true,
        data: {
          ...created,
          policyEvaluation: policyResult,
          execution: executionInfo,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { requestId } = req.params;

      const details = await requestController.getRequestDetailsById(requestId, req.organizationId);
      if (!details) {
        throw new AppError(404, "NOT_FOUND", "Request not found");
      }

      return res.json({
        success: true,
        data: details,
      });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { requestId } = req.params;

      const request = await db.queryOne<{ id: string; status: string; requested_by: string }>(
        "SELECT id, status, requested_by FROM requests WHERE id = ? AND organization_id = ?",
        [requestId, req.organizationId]
      );
      if (!request) throw new AppError(404, "NOT_FOUND", "Request not found");

      if (request.status === "completed" || request.status === "approved" || request.status === "rejected") {
        throw new AppError(400, "INVALID_STATE", `Cannot cancel a request with status '${request.status}'`);
      }

      await db.execute(
        "UPDATE requests SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
        [requestId]
      );

      // Cancel any pending approval tasks
      await db.execute(
        "UPDATE approval_tasks SET status = 'cancelled', updated_at = datetime('now') WHERE request_id = ? AND status = 'pending'",
        [requestId]
      );

      // Audit event
      await db.execute(
        `INSERT INTO audit_events (id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, metadata)
         VALUES (?, ?, ?, 'user', 'request.cancelled', 'request', ?, '{}')`,
        [uuidv4(), req.organizationId, req.user.id, requestId]
      );

      return res.json({
        success: true,
        data: { id: requestId, status: "cancelled" },
      });
    } catch (err) {
      next(err);
    }
  },

  async getRequestDetailsById(requestId: string, organizationId: string) {
    const r = await db.queryOne<{
      id: string;
      organization_id: string;
      request_number: number;
      title: string;
      category: string;
      description: string;
      business_justification: string;
      amount_minor: number | null;
      currency: string | null;
      department_id: string | null;
      department_name: string | null;
      priority: any;
      status: any;
      requested_by: string;
      requester_name: string;
      requester_email: string;
      needed_by: string | null;
      metadata: string;
      idempotency_key: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT r.*, u.full_name as requester_name, u.email as requester_email, d.name as department_name 
       FROM requests r 
       LEFT JOIN users u ON u.id = r.requested_by 
       LEFT JOIN departments d ON d.id = r.department_id 
       WHERE r.id = ? AND r.organization_id = ?`,
      [requestId, organizationId]
    );

    if (!r) return null;

    // Fetch executions linked to this request
    const executions = await db.query(
      "SELECT id, workflow_id, status, started_at, completed_at, current_node_id FROM workflow_executions WHERE request_id = ? ORDER BY created_at DESC",
      [requestId]
    );

    // Fetch approval tasks
    const approvalTasks = await db.query(
      `SELECT at.*, u.full_name as assigned_to_name, d.full_name as decided_by_name 
       FROM approval_tasks at 
       LEFT JOIN users u ON u.id = at.assigned_to 
       LEFT JOIN users d ON d.id = at.decided_by 
       WHERE at.request_id = ? 
       ORDER BY at.stage ASC, at.created_at ASC`,
      [requestId]
    );

    // Fetch audit events
    const auditEvents = await db.query(
      `SELECT ae.*, u.full_name as actor_name 
       FROM audit_events ae 
       LEFT JOIN users u ON u.id = ae.actor_user_id 
       WHERE ae.resource_id = ? OR ae.metadata LIKE ? 
       ORDER BY ae.created_at DESC`,
      [requestId, `%"requestId":"${requestId}"%`]
    );

    // Fetch linked execution steps if execution exists
    let executionSteps: any[] = [];
    if (executions.length > 0) {
      executionSteps = await db.query(
        "SELECT * FROM execution_steps WHERE execution_id = ? ORDER BY started_at ASC",
        [executions[0].id]
      );
    }

    return {
      id: r.id,
      organizationId: r.organization_id,
      requestNumber: r.request_number,
      title: r.title,
      category: r.category,
      description: r.description,
      businessJustification: r.business_justification,
      amountMinor: r.amount_minor,
      currency: r.currency,
      departmentId: r.department_id,
      departmentName: r.department_name,
      priority: r.priority,
      status: r.status,
      requestedBy: r.requested_by,
      requesterName: r.requester_name,
      requesterEmail: r.requester_email,
      neededBy: r.needed_by,
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
      idempotencyKey: r.idempotency_key,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      executions: executions.map((e) => ({
        ...e,
        steps: executionSteps,
      })),
      approvalTasks,
      auditEvents,
    };
  },

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { requestId } = req.params;

      const request = await db.queryOne<{ id: string }>(
        "SELECT id FROM requests WHERE id = ? AND organization_id = ?",
        [requestId, req.organizationId]
      );
      if (!request) {
        throw new AppError(404, "NOT_FOUND", "Request not found");
      }

      const auditEvents = await db.query(
        `SELECT ae.id, ae.action, ae.actor_type as actorType, ae.created_at as createdAt, 
                ae.metadata, u.full_name as actorName, u.email as actorEmail
         FROM audit_events ae
         LEFT JOIN users u ON u.id = ae.actor_user_id
         WHERE ae.organization_id = ? AND (ae.resource_id = ? OR ae.metadata LIKE ?)
         ORDER BY ae.created_at ASC`,
        [req.organizationId, requestId, `%"requestId":"${requestId}"%`]
      );

      return res.json({
        success: true,
        data: auditEvents.map((e) => ({
          id: e.id,
          action: e.action,
          actorType: e.actorType,
          actorName: e.actorName || "System Automation",
          actorEmail: e.actorEmail || null,
          metadata: typeof e.metadata === "string" ? JSON.parse(e.metadata) : e.metadata,
          createdAt: e.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
};
