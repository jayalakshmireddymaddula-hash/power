import { z } from "zod";

export const dashboardMetricsSchema = z.object({
  totalExecutions: z.number().int().default(0),
  runningExecutions: z.number().int().default(0),
  pendingApprovals: z.number().int().default(0),
  completedWorkflows: z.number().int().default(0),
  failedExecutions: z.number().int().default(0),
  overdueTasks: z.number().int().default(0),
  automationSuccessRate: z.number().min(0).max(100).default(100),
  estimatedTimeSavedMinutes: z.number().int().default(0),
  estimatedTimeSavedHours: z.number().default(0),
  averageDurationMinutes: z.number().default(0),
  medianDurationMinutes: z.number().default(0),
  averageApprovalTurnaroundMinutes: z.number().default(0),
  categoryBreakdown: z.array(
    z.object({
      category: z.string(),
      count: z.number(),
      successRate: z.number(),
    })
  ).default([]),
  timelineTrend: z.array(
    z.object({
      date: z.string(),
      completed: z.number(),
      failed: z.number(),
    })
  ).default([]),
});
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

export const reportFilterSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "custom"]).default("30d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
});
export type ReportFilter = z.infer<typeof reportFilterSchema>;
