import { Request, Response, NextFunction } from "express";
import { ai } from "../services/ai/ai-service.js";
import { AppError } from "../middleware/error-handler.js";
import { z } from "zod";

const classifyInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  businessJustification: z.string().max(2000).optional(),
});

const structureInputSchema = z.object({
  unstructuredText: z.string().min(5).max(5000),
});

export const aiController = {
  async classifyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const data = classifyInputSchema.parse(req.body);

      const result = await ai.classifyRequest({
        title: data.title,
        description: data.description,
        businessJustification: data.businessJustification,
        allowedCategories: ["procurement", "hr", "operations", "document_processing", "it_support", "finance"],
        permittedPriorities: ["low", "normal", "high", "urgent"],
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async structureRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const data = structureInputSchema.parse(req.body);

      const result = await ai.structureRequest({
        unstructuredText: data.unstructuredText,
        allowedCategories: ["procurement", "hr", "operations", "document_processing", "it_support", "finance"],
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async extractDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentText, filename } = req.body;
      if (!documentText || !filename) {
        throw new AppError(422, "MISSING_DATA", "Document text and filename are required.");
      }

      const result = await ai.extractDocument({
        documentText,
        filename,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async analyzeBottlenecks(req: Request, res: Response, next: NextFunction) {
    try {
      const { metrics } = req.body;
      if (!metrics) {
        throw new AppError(422, "MISSING_METRICS", "Verified metrics required for bottleneck analysis.");
      }

      const result = await ai.analyzeBottlenecks({ metrics });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async recommendImprovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { workflowName, metrics } = req.body;

      const result = await ai.recommendImprovements({
        workflowName: workflowName || "Procurement Workflow",
        metrics: metrics || {},
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
