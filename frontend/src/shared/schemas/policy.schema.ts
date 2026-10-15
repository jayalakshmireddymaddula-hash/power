import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const approvalStageConfigSchema = z.object({
  stageNumber: z.number().int().positive(),
  name: z.string().min(1).max(100),
  requiredRole: z.enum(["owner", "admin", "manager", "approver"]),
  requireDepartmentManager: z.boolean().default(false),
  requireFinanceApprover: z.boolean().default(false),
  timeoutHours: z.number().int().positive().default(48),
});
export type ApprovalStageConfig = z.infer<typeof approvalStageConfigSchema>;

export const approvalPolicyConfigSchema = z.object({
  tiers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      maxAmountMinor: z.number().int().positive().nullable(), // null means unbounded upper limit
      minAmountMinor: z.number().int().min(0).default(0),
      currency: z.string().default("INR"),
      stages: z.array(approvalStageConfigSchema).min(1),
    })
  ),
  allowSelfApproval: z.boolean().default(false),
  requireSupportingDocumentAboveMinor: z.number().int().positive().nullable().default(1000000), // ₹10,000
  allowedCurrencies: z.array(z.string()).default(["INR", "USD", "EUR", "GBP"]),
  autoEscalateHours: z.number().int().positive().default(72),
});
export type ApprovalPolicyConfig = z.infer<typeof approvalPolicyConfigSchema>;

export const approvalPolicySchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(2).max(100),
  category: z.string(),
  configuration: approvalPolicyConfigSchema,
  version: z.number().int().positive().default(1),
  active: z.boolean().default(true),
  createdBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApprovalPolicy = z.infer<typeof approvalPolicySchema>;

export const defaultProcurementPolicy: ApprovalPolicyConfig = {
  tiers: [
    {
      id: "tier_1",
      name: "Low Value (Up to ₹5,000)",
      minAmountMinor: 0,
      maxAmountMinor: 500000, // 5,000 * 100 paise
      currency: "INR",
      stages: [
        {
          stageNumber: 1,
          name: "Initial Approver Review",
          requiredRole: "approver",
          requireDepartmentManager: false,
          requireFinanceApprover: false,
          timeoutHours: 48,
        },
      ],
    },
    {
      id: "tier_2",
      name: "Mid Value (₹5,000 to ₹25,000)",
      minAmountMinor: 500001,
      maxAmountMinor: 2500000, // 25,000 * 100 paise
      currency: "INR",
      stages: [
        {
          stageNumber: 1,
          name: "Department Manager Approval",
          requiredRole: "manager",
          requireDepartmentManager: true,
          requireFinanceApprover: false,
          timeoutHours: 48,
        },
      ],
    },
    {
      id: "tier_3",
      name: "High Value (Above ₹25,000)",
      minAmountMinor: 2500001,
      maxAmountMinor: null, // unbounded
      currency: "INR",
      stages: [
        {
          stageNumber: 1,
          name: "Stage 1: Department Manager Approval",
          requiredRole: "manager",
          requireDepartmentManager: true,
          requireFinanceApprover: false,
          timeoutHours: 48,
        },
        {
          stageNumber: 2,
          name: "Stage 2: Finance Executive Review",
          requiredRole: "admin",
          requireDepartmentManager: false,
          requireFinanceApprover: true,
          timeoutHours: 48,
        },
      ],
    },
  ],
  allowSelfApproval: false,
  requireSupportingDocumentAboveMinor: 1000000, // ₹10,000
  allowedCurrencies: ["INR", "USD", "EUR", "GBP"],
  autoEscalateHours: 72,
};
