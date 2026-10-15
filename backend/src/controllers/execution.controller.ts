import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { workflowEngine } from "../workflow-engine/engine.js";

export const executionController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const executions = await db.query(
        `SELECT e.*, w.name as workflow_name, r.title as request_title, u.full_name as triggered_by_name
         FROM workflow_executions e
         JOIN workflows w ON w.id = e.workflow_id
         LEFT JOIN requests r ON r.id = e.request_id
         LEFT JOIN users u ON u.id = e.triggered_by
         WHERE e.organization_id = ?
         ORDER BY e.created_at DESC LIMIT 50`,
        [req.organizationId]
      );

      return res.json({
        success: true,
        data: executions.map((e) => ({
          id: e.id,
          organizationId: e.organization_id,
          workflowId: e.workflow_id,
          workflowVersionId: e.workflow_version_id,
          workflowName: e.workflow_name,
          requestId: e.request_id,
          requestTitle: e.request_title,
          triggeredBy: e.triggered_by,
          triggeredByName: e.triggered_by_name,
          triggerType: e.trigger_type,
          status: e.status,
          currentNodeId: e.current_node_id,
          errorCode: e.error_code,
          errorMessage: e.error_message,
          attemptCount: e.attempt_count,
          startedAt: e.started_at,
          completedAt: e.completed_at,
          createdAt: e.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { executionId } = req.params;

      const execution = await db.queryOne<{
        id: string;
        organization_id: string;
        workflow_id: string;
        workflow_version_id: string;
        request_id: string | null;
        status: string;
        input_data: string;
        output_data: string;
        current_node_id: string | null;
        error_code: string | null;
        error_message: string | null;
        started_at: string | null;
        completed_at: string | null;
        created_at: string;
      }>("SELECT * FROM workflow_executions WHERE id = ? AND organization_id = ?", [executionId, req.organizationId]);

      if (!execution) throw new AppError(404, "NOT_FOUND", "Execution not found");

      const steps = await db.query(
        "SELECT * FROM execution_steps WHERE execution_id = ? ORDER BY started_at ASC",
        [executionId]
      );

      const workflow = await db.queryOne<{ name: string }>(
        "SELECT name FROM workflows WHERE id = ?",
        [execution.workflow_id]
      );

      return res.json({
        success: true,
        data: {
          ...execution,
          workflowName: workflow?.name,
          inputData: typeof execution.input_data === "string" ? JSON.parse(execution.input_data) : execution.input_data,
          outputData: typeof execution.output_data === "string" ? JSON.parse(execution.output_data) : execution.output_data,
          steps: steps.map((s) => ({
            ...s,
            inputData: typeof s.input_data === "string" ? JSON.parse(s.input_data) : s.input_data,
            outputData: typeof s.output_data === "string" ? JSON.parse(s.output_data) : s.output_data,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async retry(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { executionId } = req.params;

      const execution = await db.queryOne<{
        id: string;
        workflow_id: string;
        status: string;
        input_data: string;
        request_id: string | null;
      }>("SELECT * FROM workflow_executions WHERE id = ? AND organization_id = ?", [executionId, req.organizationId]);

      if (!execution) throw new AppError(404, "NOT_FOUND", "Execution not found");
      if (execution.status !== "failed") {
        throw new AppError(400, "NOT_ELIGIBLE", `Only failed executions can be retried. Current status: ${execution.status}`);
      }

      // Re-trigger execution
      const newExecution = await workflowEngine.startExecution({
        workflowId: execution.workflow_id,
        organizationId: req.organizationId,
        triggeredBy: req.user.id,
        triggerType: "retry",
        requestId: execution.request_id || undefined,
        inputData: JSON.parse(execution.input_data || "{}"),
      });

      return res.json({
        success: true,
        data: newExecution,
      });
    } catch (err) {
      next(err);
    }
  },
};
