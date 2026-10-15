import { AIProvider } from "./ai-provider.interface.js";
import {
  AIClassificationResult,
  aiClassificationSchema,
  AIStructuringResult,
  aiStructuringSchema,
  AIExtractionResult,
  aiExtractionSchema,
  AIBottleneckResult,
  aiBottleneckSchema,
  AIImprovementResult,
  aiImprovementSchema,
} from "@flowpilot/shared";
import { gemini } from "../../lib/gemini.js";
import { config } from "../../config.js";
import { DemoAIProvider } from "./demo-provider.js";

const SYSTEM_PROMPT = `You are FlowPilot AI, an intelligent workflow assistance engine for an organization's operational automation platform.
YOUR RESPONSIBILITIES:
1. Interpret business requests and documents.
2. Recommend workflow categories and priorities.
3. Extract structured information from supplied content.
4. Identify missing fields and potential inconsistencies.
5. Explain recommendations using evidence from the supplied data.
6. Summarize verified operational metrics.
7. Recommend workflow improvements grounded in measurable evidence.

CORE RULES:
- You are an advisory system, not an authorization authority.
- You cannot approve purchases, reject requests, change permissions, release funds, or bypass organizational policies.
- Deterministic server-side policy evaluation always takes precedence.
- Never invent missing values, policy rules, users, approvals, metrics, or document contents.
- Return output as pure valid JSON matching the exact requested schema without Markdown backticks or commentary.`;

export class GeminiAIProvider implements AIProvider {
  private fallback = new DemoAIProvider();

  async classifyRequest(input: {
    title: string;
    description: string;
    businessJustification?: string;
    allowedCategories: string[];
    permittedPriorities: string[];
  }): Promise<AIClassificationResult> {
    if (!gemini || !config.GEMINI_API_KEY) {
      return this.fallback.classifyRequest(input);
    }

    try {
      const prompt = `Classify the supplied operational request.
Choose exactly one category from allowed list: ${JSON.stringify(input.allowedCategories)}.
Allowed priorities: ${JSON.stringify(input.permittedPriorities)}.
Title: ${input.title}
Description: ${input.description}
Justification: ${input.businessJustification || "None"}

Return JSON matching:
{
  "category": "string",
  "priority": "low"|"normal"|"high"|"urgent",
  "confidence": 0.0-1.0,
  "missing_fields": string[],
  "risk_indicators": string[],
  "reasoning_summary": "string",
  "requires_human_review": boolean
}`;

      const response = await gemini.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      const parsed = JSON.parse(text);
      return aiClassificationSchema.parse(parsed);
    } catch (err) {
      console.warn("⚠️ Gemini classification failed or unconfigured, using fallback:", err);
      return this.fallback.classifyRequest(input);
    }
  }

  async structureRequest(input: {
    unstructuredText: string;
    allowedCategories: string[];
  }): Promise<AIStructuringResult> {
    if (!gemini || !config.GEMINI_API_KEY) {
      return this.fallback.structureRequest(input);
    }

    try {
      const prompt = `Convert the supplied unstructured description into suggested structured fields.
Allowed categories: ${JSON.stringify(input.allowedCategories)}.
Unstructured Input:
"${input.unstructuredText}"

Return JSON matching:
{
  "suggested_fields": {
    "title": string|null,
    "category": string|null,
    "amount_minor": integer|null,
    "currency": "INR",
    "department": string|null,
    "priority": "normal",
    "business_justification": string|null
  },
  "missing_fields": string[],
  "warnings": string[],
  "confidence": number
}`;

      const response = await gemini.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      const parsed = JSON.parse(text);
      return aiStructuringSchema.parse(parsed);
    } catch (err) {
      console.warn("⚠️ Gemini request structuring failed, using fallback:", err);
      return this.fallback.structureRequest(input);
    }
  }

  async extractDocument(input: {
    documentText: string;
    filename: string;
    expectedType?: string;
  }): Promise<AIExtractionResult> {
    if (!gemini || !config.GEMINI_API_KEY) {
      return this.fallback.extractDocument(input);
    }

    try {
      const prompt = `Extract structured procurement/invoice fields from this document:
Filename: ${input.filename}
Document Content:
${input.documentText.slice(0, 10000)}

Return JSON matching:
{
  "document_type": "string",
  "supplier_name": string|null,
  "document_date": string|null,
  "reference_number": string|null,
  "amount_minor": integer|null,
  "currency": string|null,
  "extracted_fields": [
    {"name": "string", "value": any, "source_excerpt": "string", "confidence": number}
  ],
  "missing_fields": string[],
  "inconsistencies": string[],
  "confidence": number,
  "requires_human_review": boolean
}`;

      const response = await gemini.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      const parsed = JSON.parse(text);
      return aiExtractionSchema.parse(parsed);
    } catch (err) {
      console.warn("⚠️ Gemini document extraction failed, using fallback:", err);
      return this.fallback.extractDocument(input);
    }
  }

  async analyzeBottlenecks(input: {
    metrics: {
      totalExecutions: number;
      averageTurnaroundMinutes: number;
      pendingApprovals: number;
      overdueTasks: number;
      failedExecutions: number;
      successRate: number;
    };
  }): Promise<AIBottleneckResult> {
    if (!gemini || !config.GEMINI_API_KEY) {
      return this.fallback.analyzeBottlenecks(input);
    }

    try {
      const prompt = `Analyze verified operational metrics and identify delays:
${JSON.stringify(input.metrics)}

Return JSON matching:
{
  "summary": "string",
  "findings": [
    {"title": "string", "evidence": string[], "severity": "low"|"medium"|"high"|"critical", "confidence": number}
  ],
  "recommendations": [
    {"title": "string", "description": "string", "expected_benefit": "string", "implementation_effort": "low"|"medium"|"high", "requires_human_review": boolean}
  ],
  "data_limitations": string[]
}`;

      const response = await gemini.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      const parsed = JSON.parse(text);
      return aiBottleneckSchema.parse(parsed);
    } catch (err) {
      console.warn("⚠️ Gemini bottleneck analysis failed, using fallback:", err);
      return this.fallback.analyzeBottlenecks(input);
    }
  }

  async recommendImprovements(input: {
    workflowName: string;
    metrics: unknown;
  }): Promise<AIImprovementResult> {
    if (!gemini || !config.GEMINI_API_KEY) {
      return this.fallback.recommendImprovements(input);
    }

    try {
      const prompt = `Recommend workflow optimizations for '${input.workflowName}':
Metrics: ${JSON.stringify(input.metrics)}

Return JSON matching:
{
  "recommendations": [
    {
      "title": "string",
      "problem": "string",
      "proposed_change": "string",
      "evidence": string[],
      "expected_benefit": "string",
      "implementation_effort": "low"|"medium"|"high",
      "risks": string[],
      "requires_human_review": boolean
    }
  ],
  "summary": "string"
}`;

      const response = await gemini.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      const parsed = JSON.parse(text);
      return aiImprovementSchema.parse(parsed);
    } catch (err) {
      console.warn("⚠️ Gemini improvements recommendation failed, using fallback:", err);
      return this.fallback.recommendImprovements(input);
    }
  }
}
