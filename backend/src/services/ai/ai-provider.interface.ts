import {
  AIClassificationResult,
  AIStructuringResult,
  AIExtractionResult,
  AIBottleneckResult,
  AIImprovementResult,
} from "@flowpilot/shared";

export interface AIProvider {
  classifyRequest(input: {
    title: string;
    description: string;
    businessJustification?: string;
    allowedCategories: string[];
    permittedPriorities: string[];
  }): Promise<AIClassificationResult>;

  structureRequest(input: {
    unstructuredText: string;
    allowedCategories: string[];
  }): Promise<AIStructuringResult>;

  extractDocument(input: {
    documentText: string;
    filename: string;
    expectedType?: string;
  }): Promise<AIExtractionResult>;

  analyzeBottlenecks(input: {
    metrics: {
      totalExecutions: number;
      averageTurnaroundMinutes: number;
      pendingApprovals: number;
      overdueTasks: number;
      failedExecutions: number;
      successRate: number;
    };
  }): Promise<AIBottleneckResult>;

  recommendImprovements(input: {
    workflowName: string;
    metrics: unknown;
  }): Promise<AIImprovementResult>;
}
