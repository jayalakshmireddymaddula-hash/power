import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const notificationTypeEnum = z.enum([
  "request_submitted",
  "approval_required",
  "approval_completed",
  "request_rejected",
  "changes_requested",
  "task_assigned",
  "task_overdue",
  "workflow_failed",
  "workflow_completed",
  "system_alert",
]);
export type NotificationType = z.infer<typeof notificationTypeEnum>;

export const notificationSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  type: notificationTypeEnum,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  resourceType: z.string().nullable().optional(),
  resourceId: uuidSchema.nullable().optional(),
  deduplicationKey: z.string().nullable().optional(),
  readAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;
