export interface ConditionConfig {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "greater_than_or_equal"
    | "less_than_or_equal"
    | "contains"
    | "in";
  value: any;
}

export function evaluateCondition(config: ConditionConfig, context: Record<string, any>): boolean {
  const { field, operator, value } = config;

  // Resolve nested field if dot-notated (e.g. "request.amountMinor")
  const fieldParts = field.split(".");
  let resolvedVal: any = context;
  for (const part of fieldParts) {
    if (resolvedVal && typeof resolvedVal === "object" && part in resolvedVal) {
      resolvedVal = resolvedVal[part];
    } else {
      resolvedVal = undefined;
      break;
    }
  }

  switch (operator) {
    case "equals":
      return resolvedVal == value;

    case "not_equals":
      return resolvedVal != value;

    case "greater_than":
      return typeof resolvedVal === "number" && typeof value === "number" && resolvedVal > value;

    case "less_than":
      return typeof resolvedVal === "number" && typeof value === "number" && resolvedVal < value;

    case "greater_than_or_equal":
      return typeof resolvedVal === "number" && typeof value === "number" && resolvedVal >= value;

    case "less_than_or_equal":
      return typeof resolvedVal === "number" && typeof value === "number" && resolvedVal <= value;

    case "contains":
      if (typeof resolvedVal === "string") {
        return resolvedVal.toLowerCase().includes(String(value).toLowerCase());
      }
      if (Array.isArray(resolvedVal)) {
        return resolvedVal.includes(value);
      }
      return false;

    case "in":
      if (Array.isArray(value)) {
        return value.includes(resolvedVal);
      }
      return false;

    default:
      console.warn(`[ConditionEvaluator] Unsupported condition operator: ${operator}`);
      return false;
  }
}
