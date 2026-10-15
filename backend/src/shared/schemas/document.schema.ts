import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

export const documentStatusEnum = z.enum(["uploaded", "processing", "processed", "failed", "deleted"]);
export type DocumentStatus = z.infer<typeof documentStatusEnum>;

export const extractedFieldSchema = z.object({
  name: z.string(),
  value: z.unknown(),
  sourceExcerpt: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type ExtractedField = z.infer<typeof extractedFieldSchema>;

export const documentExtractionDataSchema = z.object({
  documentType: z.string().default("invoice"),
  supplierName: z.string().nullable().optional(),
  documentDate: z.string().nullable().optional(),
  referenceNumber: z.string().nullable().optional(),
  amountMinor: z.number().int().nullable().optional(),
  currency: z.string().nullable().optional(),
  extractedFields: z.array(extractedFieldSchema).default([]),
  missingFields: z.array(z.string()).default([]),
  inconsistencies: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
  requiresHumanReview: z.boolean().default(true),
});
export type DocumentExtractionData = z.infer<typeof documentExtractionDataSchema>;

export const documentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  uploadedBy: uuidSchema,
  uploaderName: z.string().optional(),
  requestId: uuidSchema.nullable().optional(),
  originalFilename: z.string(),
  storagePath: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  checksumSha256: z.string().nullable().optional(),
  status: documentStatusEnum,
  extractedData: documentExtractionDataSchema.optional(),
  extractionConfidence: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Document = z.infer<typeof documentSchema>;
