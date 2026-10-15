import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const taskStatusEnum = z.enum(["pending", "in_progress", "completed", "cancelled"]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const taskPriorityEnum = z.enum(["low", "normal", "high", "urgent"]);
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

export const taskSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  executionId: uuidSchema.nullable().optional(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).default(""),
  assignedTo: uuidSchema.nullable().optional(),
  assignedToName: z.string().optional(),
  createdBy: uuidSchema.nullable().optional(),
  priority: taskPriorityEnum.default("normal"),
  status: taskStatusEnum.default("pending"),
  dueAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(2000).default(""),
  assignedTo: uuidSchema.nullable().optional(),
  priority: taskPriorityEnum.default("normal"),
  dueAt: z.string().datetime().nullable().optional(),
  executionId: uuidSchema.nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  assignedTo: uuidSchema.nullable().optional(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  dueAt: z.string().datetime().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
