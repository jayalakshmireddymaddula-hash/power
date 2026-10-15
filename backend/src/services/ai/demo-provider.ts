import {
  AIProvider,
} from "./ai-provider.interface.js";
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

export class DemoAIProvider implements AIProvider {
  async classifyRequest(input: {
    title: string;
    description: string;
    businessJustification?: string;
    allowedCategories: string[];
    permittedPriorities: string[];
  }): Promise<AIClassificationResult> {
    const text = `${input.title} ${input.description} ${input.businessJustification || ""}`.toLowerCase();

    let category = "operations" as any;
    let priority = "normal" as any;
    const riskIndicators: string[] = [];
    const missingFields: string[] = [];

    if (text.includes("purchase") || text.includes("buy") || text.includes("equipment") || text.includes("laptop") || text.includes("software") || text.includes("procurement") || text.includes("vendor") || text.includes("license")) {
      category = "procurement";
    } else if (text.includes("onboard") || text.includes("employee") || text.includes("hiring") || text.includes("leave") || text.includes("salary") || text.includes("hr")) {
      category = "hr";
    } else if (text.includes("invoice") || text.includes("receipt") || text.includes("extract") || text.includes("document") || text.includes("tax")) {
      category = "document_processing";
    } else if (text.includes("bug") || text.includes("access") || text.includes("server") || text.includes("it") || text.includes("password")) {
      category = "it_support";
    } else if (text.includes("budget") || text.includes("finance") || text.includes("audit") || text.includes("reimburse")) {
      category = "finance";
    }

    if (text.includes("urgent") || text.includes("asap") || text.includes("critical") || text.includes("emergency") || text.includes("immediately")) {
      priority = "urgent";
    } else if (text.includes("high") || text.includes("priority") || text.includes("important")) {
      priority = "high";
    }

    if (category === "procurement" && !text.includes("inr") && !text.includes("rs") && !text.includes("$") && !text.match(/\d+/)) {
      missingFields.push("amount_minor");
    }

    if (!input.businessJustification || input.businessJustification.length < 15) {
      riskIndicators.push("Sparse business justification provided; verify return on investment");
    }

    const result = {
      category,
      priority,
      confidence: 0.94,
      missing_fields: missingFields,
      risk_indicators: riskIndicators,
      reasoning_summary: `Classified as ${category} with ${priority} priority based on stated requirement: '${input.title}'.`,
      requires_human_review: priority === "urgent" || missingFields.length > 0,
    };

    return aiClassificationSchema.parse(result);
  }

  async structureRequest(input: {
    unstructuredText: string;
    allowedCategories: string[];
  }): Promise<AIStructuringResult> {
    const text = input.unstructuredText;
    const lower = text.toLowerCase();

    // Extract amount if present (e.g. ₹15,000 or 15000 or $500)
    let amountMinor: number | null = null;
    const amountMatch = text.match(/(?:₹|rs\.?|\$)\s*([\d,]+)/i) || text.match(/([\d,]+)\s*(?:inr|usd|rupees)/i);
    if (amountMatch) {
      const raw = amountMatch[1].replace(/,/g, "");
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        amountMinor = num * 100; // convert to paise / cents
      }
    }

    let category = "procurement" as any;
    if (lower.includes("onboard") || lower.includes("employee") || lower.includes("leave")) {
      category = "hr";
    } else if (lower.includes("document") || lower.includes("invoice")) {
      category = "document_processing";
    } else if (lower.includes("server") || lower.includes("access") || lower.includes("vpn")) {
      category = "it_support";
    }

    let priority = "normal" as any;
    if (lower.includes("urgent") || lower.includes("asap") || lower.includes("critical")) {
      priority = "urgent";
    } else if (lower.includes("high")) {
      priority = "high";
    }

    // Determine title
    let title = "Operational Request";
    const sentences = text.split(/[.\n]/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      title = sentences[0].trim().slice(0, 100);
    }

    const missingFields: string[] = [];
    if (category === "procurement" && !amountMinor) {
      missingFields.push("amount_minor");
    }

    const result = {
      suggested_fields: {
        title,
        category,
        amount_minor: amountMinor,
        currency: "INR",
        department: "Engineering & Technology",
        priority,
        business_justification: text.length > 40 ? text : `Required for business operations: ${text}`,
      },
      missing_fields: missingFields,
      warnings: missingFields.length > 0 ? ["Please verify the requested budget before submission."] : [],
      confidence: 0.91,
    };

    return aiStructuringSchema.parse(result);
  }

  async extractDocument(input: {
    documentText: string;
    filename: string;
    expectedType?: string;
  }): Promise<AIExtractionResult> {
    const text = input.documentText;
    const filename = input.filename.toLowerCase();

    let docType = "invoice";
    if (filename.includes("receipt")) docType = "receipt";
    if (filename.includes("contract")) docType = "contract";

    // Extract invoice/ref number
    let refNumber: string | null = "INV-2026-9842";
    const refMatch = text.match(/(?:inv(?:oice)?|ref|bill)[\s#:]*([a-z0-9-_]+)/i);
    if (refMatch) refNumber = refMatch[1].toUpperCase();

    // Extract date
    let dateStr = new Date().toISOString().split("T")[0];
    const dateMatch = text.match(/\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/);
    if (dateMatch) dateStr = dateMatch[1];

    // Extract amount
    let amountMinor: number | null = 4500000; // default ₹45,000 in paise
    const amountMatch = text.match(/(?:total|amount|due)[\s:]*(?:₹|\$|rs\.?)?\s*([\d,]+)/i);
    if (amountMatch) {
      const num = parseInt(amountMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(num)) amountMinor = num * 100;
    }

    let supplierName = "Dell Technologies Enterprise India";
    const supplierMatch = text.match(/(?:from|vendor|supplier|company)[\s:]*([a-zA-Z0-9\s&]+)/i);
    if (supplierMatch) {
      supplierName = supplierMatch[1].trim().slice(0, 60);
    }

    const result = {
      document_type: docType,
      supplier_name: supplierName,
      document_date: dateStr,
      reference_number: refNumber,
      amount_minor: amountMinor,
      currency: "INR",
      extracted_fields: [
        {
          name: "supplier_name",
          value: supplierName,
          source_excerpt: `Supplier header detected in ${input.filename}`,
          confidence: 0.96,
        },
        {
          name: "reference_number",
          value: refNumber,
          source_excerpt: `Reference: ${refNumber}`,
          confidence: 0.94,
        },
        {
          name: "total_amount",
          value: amountMinor ? `₹${(amountMinor / 100).toLocaleString("en-IN")}` : "N/A",
          source_excerpt: `Total Payable: ${amountMinor ? (amountMinor / 100) : "N/A"}`,
          confidence: 0.92,
        },
      ],
      missing_fields: [],
      inconsistencies: [],
      confidence: 0.93,
      requires_human_review: false,
    };

    return aiExtractionSchema.parse(result);
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
    const { pendingApprovals, averageTurnaroundMinutes, overdueTasks, successRate } = input.metrics;

    const findings = [
      {
        title: "Approval Stage Queue Latency",
        evidence: [
          `${pendingApprovals} requests currently waiting in approval queues.`,
          `Average approval resolution turnaround is ${Math.round(averageTurnaroundMinutes)} minutes.`,
        ],
        severity: pendingApprovals > 5 ? ("high" as const) : ("medium" as const),
        confidence: 0.88,
      },
      {
        title: "Task SLA Compliance",
        evidence: [`${overdueTasks} tasks currently past configured completion window.`],
        severity: overdueTasks > 0 ? ("medium" as const) : ("low" as const),
        confidence: 0.92,
      },
    ];

    const recommendations = [
      {
        title: "Enable Automatic Approver Reminders",
        description: "Configure automated notification pings 12 hours before approval task timeout to keep managers alerted.",
        expected_benefit: "Reduces approval turnaround time by an estimated 35-45%.",
        implementation_effort: "low" as const,
        requires_human_review: true,
      },
      {
        title: "Adjust Auto-Approval Threshold for Low-Risk Purchases",
        description: "Review procurement policy to allow expedited single-click review for verified repeat supplies under ₹3,000.",
        expected_benefit: "Removes routine bottleneck on department managers.",
        implementation_effort: "medium" as const,
        requires_human_review: true,
      },
    ];

    const result = {
      summary: `Workflow analytics indicate ${successRate}% automation health. The primary latency driver is approver turnaround time (${Math.round(averageTurnaroundMinutes)} min avg).`,
      findings,
      recommendations,
      data_limitations: input.metrics.totalExecutions < 10 ? ["Sample size is currently small; confidence intervals will widen with ongoing executions."] : [],
    };

    return aiBottleneckSchema.parse(result);
  }

  async recommendImprovements(input: {
    workflowName: string;
    metrics: unknown;
  }): Promise<AIImprovementResult> {
    const result = {
      summary: `Recommendations tailored to optimize throughput and error recovery for '${input.workflowName}'.`,
      recommendations: [
        {
          title: "Pre-execution Form Validation Hook",
          problem: "Incomplete purchase justification causes 18% of requests to be returned for changes.",
          proposed_change: "Enforce a minimum 25-character justification check at client and API intake boundary.",
          evidence: ["Historical request revision cycles in procurement."],
          expected_benefit: "Decreases round-trip delays by up to 2.4 hours per request.",
          implementation_effort: "low" as const,
          risks: ["Slightly higher form entry threshold for employees."],
          requires_human_review: true,
        },
        {
          title: "Tier-2 Secondary Escalation Route",
          problem: "High value requests (>₹25,000) wait if primary Finance approver is on leave.",
          proposed_change: "Add an automatic delegation fallback after 48 hours to secondary authorized admin.",
          evidence: ["Turnaround metrics on Tier-3 multi-stage approval tickets."],
          expected_benefit: "Prevents executive backlog and purchase stall.",
          implementation_effort: "medium" as const,
          risks: ["Requires maintaining an active designated delegate pool."],
          requires_human_review: true,
        },
      ],
    };

    return aiImprovementSchema.parse(result);
  }
}
