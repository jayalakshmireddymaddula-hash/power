import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const workflowStatusEnum = z.enum(["draft", "active", "paused", "archived"]);
export type WorkflowStatus = z.infer<typeof workflowStatusEnum>;

export const executionStatusEnum = z.enum([
  "queued",
  "running",
  "waiting_approval",
  "waiting_delay",
  "completed",
  "failed",
  "cancelled",
]);
export type ExecutionStatus = z.infer<typeof executionStatusEnum>;

export const stepStatusEnum = z.enum([
  "pending",
  "running",
  "waiting",
  "completed",
  "failed",
  "skipped",
]);
export type StepStatus = z.infer<typeof stepStatusEnum>;

export const nodeTypeEnum = z.enum([
  "trigger",
  "condition",
  "ai_classify",
  "ai_extract",
  "approval",
  "assign_task",
  "notification",
  "delay",
  "generate_report",
  "end",
]);
export type NodeType = z.infer<typeof nodeTypeEnum>;

// Node definitions in graph
export const workflowNodeSchema = z.object({
  id: z.string().min(1).max(64),
  type: nodeTypeEnum,
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;

export const workflowEdgeSchema = z.object({
  id: z.string().min(1).max(64),
  source: z.string().min(1).max(64),
  target: z.string().min(1).max(64),
  label: z.string().max(50).optional(),
  conditionHandle: z.enum(["true", "false", "default"]).optional(),
});
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

export const workflowDefinitionSchema = z.object({
  nodes: z.array(workflowNodeSchema).min(2, "Workflow must contain at least a trigger and an end node"),
  edges: z.array(workflowEdgeSchema).min(1, "Workflow must contain at least one connection"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(150),
  description: z.string().trim().max(500).default(""),
  category: z.string().min(2).max(50),
  definition: workflowDefinitionSchema.optional(),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z.object({
  name: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.string().min(2).max(50).optional(),
  status: workflowStatusEnum.optional(),
  definition: workflowDefinitionSchema.optional(),
});
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

export const workflowExecutionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  workflowId: uuidSchema,
  workflowVersionId: uuidSchema,
  workflowName: z.string().optional(),
  requestId: uuidSchema.nullable().optional(),
  requestTitle: z.string().nullable().optional(),
  triggeredBy: uuidSchema.nullable().optional(),
  triggerType: z.string().default("manual"),
  status: executionStatusEnum,
  inputData: z.record(z.string(), z.unknown()).default({}),
  outputData: z.record(z.string(), z.unknown()).default({}),
  currentNodeId: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  attemptCount: z.number().int().default(0),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowExecution = z.infer<typeof workflowExecutionSchema>;

export const executionStepSchema = z.object({
  id: uuidSchema,
  executionId: uuidSchema,
  nodeId: z.string(),
  nodeType: nodeTypeEnum,
  status: stepStatusEnum,
  inputData: z.record(z.string(), z.unknown()).default({}),
  outputData: z.record(z.string(), z.unknown()).default({}),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  attemptCount: z.number().default(0),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type ExecutionStep = z.infer<typeof executionStepSchema>;
