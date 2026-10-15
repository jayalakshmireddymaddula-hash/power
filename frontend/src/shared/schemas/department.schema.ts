import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const departmentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().trim().min(2, "Department name must be at least 2 characters").max(100),
  managerUserId: uuidSchema.nullable().optional(),
  createdAt: z.string(),
});

export type Department = z.infer<typeof departmentSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Department name must be at least 2 characters").max(100),
  managerUserId: uuidSchema.nullable().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
