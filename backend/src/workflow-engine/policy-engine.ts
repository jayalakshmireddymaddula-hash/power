import { db } from "../lib/db.js";
import { ApprovalPolicyConfig, defaultProcurementPolicy } from "@flowpilot/shared";

export interface PolicyEvaluationResult {
  requiresApproval: boolean;
  policyName: string;
  tierId: string;
  tierName: string;
  stages: {
    stageNumber: number;
    name: string;
    requiredRole: string;
    requireDepartmentManager: boolean;
    requireFinanceApprover: boolean;
    timeoutHours: number;
  }[];
  totalStages: number;
  allowSelfApproval: boolean;
  explanation: string;
}

export async function evaluateApprovalPolicy(
  organizationId: string,
  category: string,
  amountMinor: number | null | undefined,
  currency: string = "INR"
): Promise<PolicyEvaluationResult> {
  // Query active policy from DB
  const policyRow = await db.queryOne<{
    name: string;
    configuration: string;
  }>(
    "SELECT name, configuration FROM approval_policies WHERE organization_id = ? AND category = ? AND active = 1 ORDER BY version DESC LIMIT 1",
    [organizationId, category]
  );

  let config: ApprovalPolicyConfig = defaultProcurementPolicy;
  let policyName = "Standard Corporate Procurement Policy";

  if (policyRow && policyRow.configuration) {
    try {
      config = JSON.parse(policyRow.configuration);
      policyName = policyRow.name;
    } catch {
      config = defaultProcurementPolicy;
    }
  }

  // Non-procurement workflows or requests without amount
  if (!amountMinor || amountMinor <= 0) {
    return {
      requiresApproval: false,
      policyName,
      tierId: "standard_flow",
      tierName: "Standard Request Flow",
      stages: [],
      totalStages: 0,
      allowSelfApproval: config.allowSelfApproval,
      explanation: "Request does not involve monetary expenditure; standard routing applies.",
    };
  }

  // Find matching tier based on integer minor units (paise)
  for (const tier of config.tiers) {
    const min = tier.minAmountMinor ?? 0;
    const max = tier.maxAmountMinor;

    if (amountMinor >= min && (max === null || max === undefined || amountMinor <= max)) {
      const formattedAmount = (amountMinor / 100).toLocaleString("en-IN");
      const explanation =
        tier.stages.length > 1
          ? `Amount (₹${formattedAmount}) exceeds high-value threshold; sequential ${tier.stages.length}-stage approval required (Dept Manager followed by Executive Finance).`
          : `Amount (₹${formattedAmount}) falls within ${tier.name}; single approval required by ${tier.stages[0]?.requiredRole}.`;

      return {
        requiresApproval: true,
        policyName,
        tierId: tier.id,
        tierName: tier.name,
        stages: tier.stages,
        totalStages: tier.stages.length,
        allowSelfApproval: config.allowSelfApproval,
        explanation,
      };
    }
  }

  // Default fallback if no tier matches
  return {
    requiresApproval: true,
    policyName,
    tierId: "default_tier",
    tierName: "Executive Review Tier",
    stages: [
      {
        stageNumber: 1,
        name: "Department Manager Approval",
        requiredRole: "manager",
        requireDepartmentManager: true,
        requireFinanceApprover: false,
        timeoutHours: 48,
      },
      {
        stageNumber: 2,
        name: "Finance Executive Authorization",
        requiredRole: "admin",
        requireDepartmentManager: false,
        requireFinanceApprover: true,
        timeoutHours: 48,
      },
    ],
    totalStages: 2,
    allowSelfApproval: false,
    explanation: "Amount requires standard multi-stage approval under fallback policy.",
  };
}
