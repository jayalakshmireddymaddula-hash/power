import { WorkflowNode } from "@flowpilot/shared";
import { evaluateCondition, ConditionConfig } from "./condition-evaluator.js";
import { ai } from "../services/ai/ai-service.js";
import { db } from "../lib/db.js";
import { v4 as uuidv4 } from "uuid";
import { evaluateApprovalPolicy } from "./policy-engine.js";

export interface NodeExecutionContext {
  organizationId: string;
  executionId: string;
  workflowId: string;
  workflowVersionId: string;
  requestId?: string;
  userId?: string;
  inputData: Record<string, any>;
  stepOutputs: Record<string, any>;
}

export interface NodeExecutionResult {
  status: "completed" | "waiting" | "failed";
  output: Record<string, any>;
  nextConditionHandle?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type NodeHandler = (
  node: WorkflowNode,
  context: NodeExecutionContext
) => Promise<NodeExecutionResult>;

export const nodeHandlers: Record<string, NodeHandler> = {
  trigger: async (_node, context) => {
    return {
      status: "completed",
      output: {
        triggeredAt: new Date().toISOString(),
        ...context.inputData,
      },
    };
  },

  condition: async (node, context) => {
    const combinedContext = {
      ...context.inputData,
      ...context.stepOutputs,
    };

    const conditionResult = evaluateCondition(node.config as unknown as ConditionConfig, combinedContext);
    const branchHandle = conditionResult ? "true" : "false";

    return {
      status: "completed",
      output: {
        evaluatedCondition: node.config,
        result: conditionResult,
        branch: branchHandle,
      },
      nextConditionHandle: branchHandle,
    };
  },

  ai_classify: async (_node, context) => {
    const input = context.inputData;
    const classification = await ai.classifyRequest({
      title: input.title || "Operational Request",
      description: input.description || "",
      businessJustification: input.businessJustification || "",
      allowedCategories: ["procurement", "hr", "operations", "document_processing", "it_support", "finance"],
      permittedPriorities: ["low", "normal", "high", "urgent"],
    });

    // Record AI Analysis for auditability
    await db.execute(
      `INSERT INTO ai_analyses (id, organization_id, requested_by, resource_type, resource_id, analysis_type, model_name, prompt_version, result, confidence, status)
       VALUES (?, ?, ?, 'execution', ?, 'classify_request', 'gemini-2.5-flash', 'v1.0', ?, ?, 'completed')`,
      [uuidv4(), context.organizationId, context.userId || null, context.executionId, JSON.stringify(classification), classification.confidence]
    );

    return {
      status: "completed",
      output: { classification },
    };
  },

  ai_extract: async (_node, context) => {
    const input = context.inputData;
    const extraction = await ai.extractDocument({
      documentText: input.documentText || "Invoice / Purchase Bill Excerpt",
      filename: input.filename || "invoice.pdf",
    });

    // Record AI Analysis for auditability
    await db.execute(
      `INSERT INTO ai_analyses (id, organization_id, requested_by, resource_type, resource_id, analysis_type, model_name, prompt_version, result, confidence, status)
       VALUES (?, ?, ?, 'execution', ?, 'extract_document', 'gemini-2.5-flash', 'v1.0', ?, ?, 'completed')`,
      [uuidv4(), context.organizationId, context.userId || null, context.executionId, JSON.stringify(extraction), extraction.confidence]
    );

    return {
      status: "completed",
      output: { extraction },
    };
  },

  approval: async (node, context) => {
    const requestId = context.requestId || context.inputData.requestId;
    if (!requestId) {
      return {
        status: "failed",
        output: {},
        errorCode: "MISSING_REQUEST_ID",
        errorMessage: "Approval node requires an associated requestId.",
      };
    }

    // Evaluate policy to assign appropriate stage and role
    const request = await db.queryOne<{
      id: string;
      title: string;
      category: string;
      amount_minor: number | null;
      currency: string | null;
      requested_by: string;
      department_id: string | null;
    }>("SELECT id, title, category, amount_minor, currency, requested_by, department_id FROM requests WHERE id = ?", [requestId]);

    const policy = await evaluateApprovalPolicy(
      context.organizationId,
      request?.category || "procurement",
      request?.amount_minor,
      request?.currency || "INR"
    );

    const stageNumber = (node.config.stage as number) || 1;
    const stageConfig = policy.stages.find((s) => s.stageNumber === stageNumber) || policy.stages[0];
    const requiredRole = (node.config.requiredRole as string) || stageConfig?.requiredRole || "approver";

    // Prevent self-approval: find an eligible approver who is NOT the requester
    let assignedUserId: string | null = null;
    const eligibleMembers = await db.query<{ user_id: string; role: string }>(
      `SELECT user_id, role FROM organization_members 
       WHERE organization_id = ? AND status = 'active' AND (role = ? OR role = 'owner' OR role = 'admin')
       AND user_id != ?
       ORDER BY role = ? DESC LIMIT 1`,
      [context.organizationId, requiredRole, context.userId || "", requiredRole]
    );

    if (eligibleMembers.length > 0) {
      assignedUserId = eligibleMembers[0].user_id;
    }

    const taskId = uuidv4();
    const dueAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    await db.execute(
      `INSERT INTO approval_tasks (id, organization_id, request_id, execution_id, assigned_to, required_role, stage, status, due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [taskId, context.organizationId, requestId, context.executionId, assignedUserId, requiredRole, stageNumber, dueAt]
    );

    // Update request status to awaiting_approval
    await db.execute("UPDATE requests SET status = 'awaiting_approval', updated_at = datetime('now') WHERE id = ?", [requestId]);

    // Send notification to approver
    if (assignedUserId) {
      await db.execute(
        `INSERT INTO notifications (id, organization_id, user_id, type, title, message, resource_type, resource_id)
         VALUES (?, ?, ?, 'approval_required', 'Approval Required: Purchase Request', ?, 'approval', ?)`,
        [uuidv4(), context.organizationId, assignedUserId, `Request '${request?.title || "Purchase"}' requires your review.`, taskId]
      );
    }

    return {
      status: "waiting", // Pauses execution until decision is recorded
      output: {
        approvalTaskId: taskId,
        stage: stageNumber,
        requiredRole,
        assignedTo: assignedUserId,
        policyApplied: policy.tierName,
      },
    };
  },

  assign_task: async (node, context) => {
    const taskId = uuidv4();
    const title = (node.config.title as string) || node.name || "Operational Task";
    const priority = (node.config.priority as any) || "normal";
    const assignedTo = context.userId || null;

    await db.execute(
      `INSERT INTO tasks (id, organization_id, execution_id, title, description, assigned_to, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [taskId, context.organizationId, context.executionId, title, node.description || "", assignedTo, priority]
    );

    if (assignedTo) {
      await db.execute(
        `INSERT INTO notifications (id, organization_id, user_id, type, title, message, resource_type, resource_id)
         VALUES (?, ?, ?, 'task_assigned', 'New Task Assigned', ?, 'task', ?)`,
        [uuidv4(), context.organizationId, assignedTo, `Task assigned: ${title}`, taskId]
      );
    }

    return {
      status: "completed",
      output: { taskId, title, assignedTo },
    };
  },

  notification: async (node, context) => {
    const notifId = uuidv4();
    const title = (node.config.title as string) || "Workflow Notification";
    const targetUserId = context.userId;

    if (targetUserId) {
      await db.execute(
        `INSERT INTO notifications (id, organization_id, user_id, type, title, message, resource_type, resource_id)
         VALUES (?, ?, ?, 'workflow_completed', ?, ?, 'execution', ?)`,
        [notifId, context.organizationId, targetUserId, title, `Workflow executed successfully for ${context.inputData.title || "request"}.`, context.executionId]
      );
    }

    return {
      status: "completed",
      output: { notificationId: notifId, sent: true },
    };
  },

  delay: async (node, context) => {
    const delayMinutes = (node.config.delayMinutes as number) || 5;
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    // Schedule delayed continuation in jobs queue
    await db.execute(
      `INSERT INTO jobs (id, organization_id, queue_name, payload, status, scheduled_for)
       VALUES (?, ?, 'delay_continuation', ?, 'pending', ?)`,
      [uuidv4(), context.organizationId, JSON.stringify({ executionId: context.executionId, currentNodeId: node.id }), scheduledFor]
    );

    return {
      status: "waiting",
      output: { delayedUntil: scheduledFor, delayMinutes },
    };
  },

  generate_report: async (_node, context) => {
    const metrics = await db.queryOne<{ total: number }>(
      "SELECT COUNT(*) as total FROM workflow_executions WHERE organization_id = ?",
      [context.organizationId]
    );

    return {
      status: "completed",
      output: {
        reportGeneratedAt: new Date().toISOString(),
        totalWorkflowsTracked: metrics?.total || 0,
      },
    };
  },

  end: async (_node, context) => {
    // If request exists, mark as completed
    if (context.requestId) {
      await db.execute(
        "UPDATE requests SET status = 'completed', updated_at = datetime('now') WHERE id = ?",
        [context.requestId]
      );
    }

    return {
      status: "completed",
      output: { completed: true, timestamp: new Date().toISOString() },
    };
  },
};
