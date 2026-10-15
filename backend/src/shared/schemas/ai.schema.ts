import { z } from "zod";
import { requestCategoryEnum, requestPriorityEnum } from "./request.schema.js";

// Section 15.1: Request Classification
export const aiClassificationSchema = z.object({
  category: requestCategoryEnum,
  priority: requestPriorityEnum,
  confidence: z.number().min(0).max(1),
  missing_fields: z.array(z.string()).default([]),
  risk_indicators: z.array(z.string()).default([]),
  reasoning_summary: z.string().max(1000),
  requires_human_review: z.boolean(),
});
export type AIClassificationResult = z.infer<typeof aiClassificationSchema>;

// Section 15.2: Natural-Language Request Structuring
export const aiStructuringSchema = z.object({
  suggested_fields: z.object({
    title: z.string().nullable().optional(),
    category: requestCategoryEnum.nullable().optional(),
    amount_minor: z.number().int().positive().nullable().optional(),
    currency: z.string().length(3).nullable().optional(),
    department: z.string().nullable().optional(),
    priority: requestPriorityEnum.nullable().optional(),
    business_justification: z.string().nullable().optional(),
  }),
  missing_fields: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});
export type AIStructuringResult = z.infer<typeof aiStructuringSchema>;

// Section 15.3: Document Extraction
export const aiExtractedFieldSchema = z.object({
  name: z.string(),
  value: z.unknown(),
  source_excerpt: z.string().max(250).optional(),
  confidence: z.number().min(0).max(1),
});
export type AIExtractedField = z.infer<typeof aiExtractedFieldSchema>;

export const aiExtractionSchema = z.object({
  document_type: z.string(),
  supplier_name: z.string().nullable(),
  document_date: z.string().nullable(),
  reference_number: z.string().nullable(),
  amount_minor: z.number().int().nullable(),
  currency: z.string().nullable(),
  extracted_fields: z.array(aiExtractedFieldSchema).default([]),
  missing_fields: z.array(z.string()).default([]),
  inconsistencies: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  requires_human_review: z.boolean(),
});
export type AIExtractionResult = z.infer<typeof aiExtractionSchema>;

// Section 15.4: Approval Routing Advisory
export const aiAdvisorySchema = z.object({
  policy_outcome: z.string(),
  explanation: z.string().max(1000),
  missing_prerequisites: z.array(z.string()).default([]),
  recommended_review: z.boolean(),
  policy_references: z.array(z.string()).default([]),
});
export type AIAdvisoryResult = z.infer<typeof aiAdvisorySchema>;

// Section 15.5: Bottleneck Analysis
export const aiBottleneckFindingSchema = z.object({
  title: z.string(),
  evidence: z.array(z.string()),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
});

export const aiBottleneckRecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  expected_benefit: z.string(),
  implementation_effort: z.enum(["low", "medium", "high"]),
  requires_human_review: z.boolean(),
});

export const aiBottleneckSchema = z.object({
  summary: z.string(),
  findings: z.array(aiBottleneckFindingSchema),
  recommendations: z.array(aiBottleneckRecommendationSchema),
  data_limitations: z.array(z.string()).default([]),
});
export type AIBottleneckResult = z.infer<typeof aiBottleneckSchema>;

// Section 15.6: Workflow Improvement Recommendations
export const aiImprovementItemSchema = z.object({
  title: z.string(),
  problem: z.string(),
  proposed_change: z.string(),
  evidence: z.array(z.string()),
  expected_benefit: z.string(),
  implementation_effort: z.enum(["low", "medium", "high"]),
  risks: z.array(z.string()),
  requires_human_review: z.boolean(),
});

export const aiImprovementSchema = z.object({
  recommendations: z.array(aiImprovementItemSchema),
  summary: z.string(),
});
export type AIImprovementResult = z.infer<typeof aiImprovementSchema>;
