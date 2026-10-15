import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const requestCategoryEnum = z.enum([
  "procurement",
  "hr",
  "operations",
  "document_processing",
  "it_support",
  "finance",
]);
export type RequestCategory = z.infer<typeof requestCategoryEnum>;

export const requestPriorityEnum = z.enum(["low", "normal", "high", "urgent"]);
export type RequestPriority = z.infer<typeof requestPriorityEnum>;

export const requestStatusEnum = z.enum([
  "draft",
  "submitted",
  "processing",
  "awaiting_approval",
  "changes_requested",
  "approved",
  "rejected",
  "completed",
  "cancelled",
]);
export type RequestStatus = z.infer<typeof requestStatusEnum>;

export const createRequestSchema = z
  .object({
    title: z.string().trim().min(5, "Title must be at least 5 characters").max(150),
    category: requestCategoryEnum,
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
    businessJustification: z.string().trim().min(10, "Business justification must be at least 10 characters").max(2000),
    amountMinor: z.number().int().positive("Amount must be greater than 0").nullable().optional(),
    currency: z.string().length(3, "Currency must be a 3-letter ISO code").default("INR").nullable().optional(),
    departmentId: uuidSchema.nullable().optional(),
    priority: requestPriorityEnum.default("normal"),
    neededBy: z.string().datetime().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    idempotencyKey: z.string().max(100).optional(),
    documentId: uuidSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      // Purchase/procurement requests require amount and currency
      if (data.category === "procurement") {
        return typeof data.amountMinor === "number" && data.amountMinor > 0 && !!data.currency;
      }
      return true;
    },
    {
      message: "Procurement requests require a valid positive amount and currency",
      path: ["amountMinor"],
    }
  );

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const updateRequestSchema = z.object({
  title: z.string().trim().min(5).max(150).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  businessJustification: z.string().trim().min(10).max(2000).optional(),
  amountMinor: z.number().int().positive().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  priority: requestPriorityEnum.optional(),
  neededBy: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

export const requestDetailSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  requestNumber: z.number(),
  title: z.string(),
  category: requestCategoryEnum,
  description: z.string(),
  businessJustification: z.string(),
  amountMinor: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  departmentName: z.string().nullable().optional(),
  priority: requestPriorityEnum,
  status: requestStatusEnum,
  requestedBy: uuidSchema,
  requesterName: z.string().optional(),
  requesterEmail: z.string().optional(),
  neededBy: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RequestDetail = z.infer<typeof requestDetailSchema>;
