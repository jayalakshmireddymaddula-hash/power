import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import { ai } from "../services/ai/ai-service.js";

export const documentController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const docs = await db.query(
        `SELECT d.*, u.full_name as uploader_name
         FROM documents d
         JOIN users u ON u.id = d.uploaded_by
         WHERE d.organization_id = ?
         ORDER BY d.created_at DESC`,
        [req.organizationId]
      );

      return res.json({
        success: true,
        data: docs.map((d) => ({
          id: d.id,
          organizationId: d.organization_id,
          uploadedBy: d.uploaded_by,
          uploaderName: d.uploader_name,
          requestId: d.request_id,
          originalFilename: d.original_filename,
          storagePath: d.storage_path,
          mimeType: d.mime_type,
          sizeBytes: d.size_bytes,
          status: d.status,
          extractedData: typeof d.extracted_data === "string" ? JSON.parse(d.extracted_data) : d.extracted_data,
          extractionConfidence: d.extraction_confidence,
          errorMessage: d.error_message,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const { filename, mimeType, sizeBytes, fileContentText, requestId } = req.body;
      if (!filename || !mimeType) {
        throw new AppError(422, "MISSING_FIELDS", "Filename and MIME type are required.");
      }

      // Check allowed MIME types
      const allowedMimes = ["application/pdf", "image/png", "image/jpeg", "text/plain", "text/csv"];
      if (!allowedMimes.includes(mimeType)) {
        throw new AppError(422, "INVALID_MIME", `MIME type '${mimeType}' is not supported. Allowed: ${allowedMimes.join(", ")}`);
      }

      const docId = uuidv4();
      const storagePath = `org_${req.organizationId}/${docId}_${filename}`;

      // Insert document
      await db.execute(
        `INSERT INTO documents (
          id, organization_id, uploaded_by, request_id, original_filename, storage_path, mime_type, size_bytes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
        [docId, req.organizationId, req.user.id, requestId || null, filename, storagePath, mimeType, sizeBytes || 1024]
      );

      // Run AI Extraction
      const textToExtract = fileContentText || `Sample invoice file content for ${filename}. Total: ₹45,000 INR from Dell Technologies. Reference: INV-2026-9842.`;
      const extraction = await ai.extractDocument({
        documentText: textToExtract,
        filename,
      });

      // Update document with extracted data
      await db.execute(
        `UPDATE documents 
         SET status = 'processed', extracted_data = ?, extraction_confidence = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [JSON.stringify(extraction), extraction.confidence, docId]
      );

      const doc = await db.queryOne("SELECT * FROM documents WHERE id = ?", [docId]);

      return res.status(201).json({
        success: true,
        data: {
          ...doc,
          extractedData: extraction,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { documentId } = req.params;

      const doc = await db.queryOne<{
        id: string;
        organization_id: string;
        uploaded_by: string;
        request_id: string | null;
        original_filename: string;
        storage_path: string;
        mime_type: string;
        size_bytes: number;
        status: string;
        extracted_data: string;
        extraction_confidence: number | null;
        created_at: string;
      }>("SELECT * FROM documents WHERE id = ? AND organization_id = ?", [documentId, req.organizationId]);

      if (!doc) throw new AppError(404, "NOT_FOUND", "Document not found");

      return res.json({
        success: true,
        data: {
          ...doc,
          extractedData: typeof doc.extracted_data === "string" ? JSON.parse(doc.extracted_data) : doc.extracted_data,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async process(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { documentId } = req.params;

      const doc = await db.queryOne<{ id: string; original_filename: string }>(
        "SELECT id, original_filename FROM documents WHERE id = ? AND organization_id = ?",
        [documentId, req.organizationId]
      );
      if (!doc) throw new AppError(404, "NOT_FOUND", "Document not found");

      const extraction = await ai.extractDocument({
        documentText: `Reprocessing document ${doc.original_filename}. Reference: INV-2026-9842. Total: ₹45,000 INR.`,
        filename: doc.original_filename,
      });

      await db.execute(
        "UPDATE documents SET status = 'processed', extracted_data = ?, extraction_confidence = ?, updated_at = datetime('now') WHERE id = ?",
        [JSON.stringify(extraction), extraction.confidence, documentId]
      );

      return res.json({
        success: true,
        data: {
          documentId,
          status: "processed",
          extractedData: extraction,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
