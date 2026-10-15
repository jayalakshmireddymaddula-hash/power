import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const approvalStatusEnum = z.enum([
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "cancelled",
]);
export type ApprovalStatus = z.infer<typeof approvalStatusEnum>;

export const approvalTaskSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  requestId: uuidSchema,
  executionId: uuidSchema,
  assignedTo: uuidSchema.nullable().optional(),
  requiredRole: z.string().nullable().optional(),
  stage: z.number().int().positive().default(1),
  status: approvalStatusEnum,
  decisionComment: z.string().nullable().optional(),
  decidedBy: uuidSchema.nullable().optional(),
  decidedByName: z.string().optional(),
  decidedAt: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Expanded fields for UI
  requestTitle: z.string().optional(),
  requestCategory: z.string().optional(),
  amountMinor: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  requesterName: z.string().optional(),
  requesterEmail: z.string().optional(),
  departmentName: z.string().nullable().optional(),
});
export type ApprovalTask = z.infer<typeof approvalTaskSchema>;

export const approveDecisionSchema = z.object({
  comment: z.string().trim().max(1000).optional(),
});
export type ApproveDecisionInput = z.infer<typeof approveDecisionSchema>;

export const rejectDecisionSchema = z.object({
  comment: z.string().trim().min(5, "A reason must be provided for rejection").max(1000),
});
export type RejectDecisionInput = z.infer<typeof rejectDecisionSchema>;

export const requestChangesDecisionSchema = z.object({
  comment: z.string().trim().min(5, "Please describe the changes requested").max(1000),
});
export type RequestChangesDecisionInput = z.infer<typeof requestChangesDecisionSchema>;
