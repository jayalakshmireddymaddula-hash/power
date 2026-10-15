import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FilePlus2,
  FileText,
  Sliders,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export const DashboardPage: React.FC = () => {
  const { activeOrg } = useAuth();

  const [metrics, setMetrics] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Authoritative SQL Metrics
      const mData = await api.get("/dashboard/metrics");
      setMetrics(mData);

      // 2. Recent Requests
      const rData = await api.get("/requests?limit=5");
      setRecentRequests(rData || []);

      // 3. Pending Approvals
      const aData = await api.get("/approvals?status=pending");
      setPendingApprovals(aData || []);

      // 4. Bottleneck AI summary
      const sData = await api.get("/reports/summary");
      setAiSummary(sData?.analysis);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeOrg?.id]);

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    setSeedSuccessMsg(null);
    try {
      const res = await api.post<{ message: string }>("/demo/seed");
      setSeedSuccessMsg(res.message);
      await fetchDashboardData();
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Failed to seed demo data: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-3">
            <span>Automation Operations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
              Live Verified
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline orchestration, approval SLAs, and verified efficiency gains for {activeOrg?.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedDemoData}
            isLoading={isSeeding}
            leftIcon={<Sparkles className="w-4 h-4 text-indigo-400" />}
            title="Generate synthetic demonstration requests and multi-tier approval tickets"
          >
            Seed Demo Scenario
          </Button>

          <Link to="/app/requests/new">
            <Button variant="primary" size="sm" leftIcon={<FilePlus2 className="w-4 h-4" />}>
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {seedSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{seedSuccessMsg}</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Metrics refreshed</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Executions */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Total Executions</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold text-white font-display">
              {metrics?.totalExecutions ?? 0}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="text-indigo-400 font-semibold">{metrics?.runningExecutions ?? 0}</span>
            <span>currently active in engine</span>
          </div>
        </Card>

        {/* KPI 2: Pending Approvals */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Pending Approvals</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-amber-400 font-display">
              {metrics?.pendingApprovals ?? 0}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Awaiting human decision</span>
            {metrics?.pendingApprovals > 0 && (
              <Link to="/app/approvals" className="text-amber-400 hover:underline font-medium">
                Review &rarr;
              </Link>
            )}
          </div>
        </Card>

        {/* KPI 3: Automation Success Rate */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Success Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 font-display">
              {metrics?.automationSuccessRate ?? 100}%
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="text-emerald-400 font-semibold">{metrics?.completedWorkflows ?? 0}</span>
            <span>completed, {metrics?.failedExecutions ?? 0} failed</span>
          </div>
        </Card>

        {/* KPI 4: Time Saved (Documented Estimate) */}
        <Card className="flex flex-col justify-between border-indigo-500/30 bg-indigo-950/20">
          <div>
            <div className="flex items-center justify-between text-xs text-indigo-300 mb-2">
              <span className="font-semibold">Estimated Time Saved</span>
              <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <p className="text-3xl font-extrabold text-white font-display">
              {metrics?.estimatedTimeSavedHours ?? 0} <span className="text-sm font-normal text-slate-300">hrs</span>
            </p>
          </div>
          <div className="mt-3 text-[10px] text-indigo-300/80 pt-2 border-t border-indigo-500/20 leading-tight">
            <span>Based on 120m manual baseline vs ~2m measured automated execution duration.</span>
          </div>
        </Card>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Execution Velocity Trend</h3>
              <p className="text-xs text-slate-400">Completed vs failed runs across recent measurement periods</p>
            </div>
            <span className="text-xs text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              14-Day View
            </span>
          </div>
          <div className="h-64 w-full">
            {metrics?.timelineTrend && metrics.timelineTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.timelineTrend}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    name="Completed"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="none"
                    name="Failed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <span>No execution activity in selected date window. Click "Seed Demo Scenario" above.</span>
              </div>
            )}
          </div>
        </Card>

        {/* Category Breakdown Bar Chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Workflows by Category</h3>
              <p className="text-xs text-slate-400">Total automated tickets</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {metrics?.categoryBreakdown && metrics.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.categoryBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Executions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <span>No categorical data recorded yet</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Middle Row: Pending Approvals & AI Bottleneck Panel */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Approvals Action Queue */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Pending Approval Queue</h3>
            </div>
            <Link to="/app/approvals" className="text-xs text-indigo-400 hover:underline">
              View All Approvals ({pendingApprovals.length})
            </Link>
          </div>

          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                All approval queues are clear! No requests currently blocked on human review.
              </p>
            ) : (
              pendingApprovals.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {item.requestTitle}
                      </span>
                      <Badge variant="warning" size="sm">
                        Stage {item.stage}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Requester: {item.requesterName}</span>
                      {item.amountMinor && (
                        <span className="font-mono text-emerald-400 font-semibold">
                          ₹{(item.amountMinor / 100).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link to={`/app/approvals/${item.id}`}>
                    <Button variant="outline" size="sm" className="shrink-0">
                      Decide
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* AI Bottleneck & SLA Advisory Panel */}
        <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900/50 to-slate-900/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">AI Bottleneck & Efficiency Insights</h3>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Grounded in Verified SQL
            </span>
          </div>

          {aiSummary ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {aiSummary.summary}
              </p>

              {aiSummary.findings && aiSummary.findings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Observed Pipeline Findings:
                  </p>
                  {aiSummary.findings.slice(0, 2).map((f: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{f.title}</span>
                        <Badge
                          variant={f.severity === "high" ? "danger" : "warning"}
                          size="sm"
                        >
                          {f.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{f.evidence?.join(" ")}</p>
                    </div>
                  ))}
                </div>
              )}

              {aiSummary.recommendations && aiSummary.recommendations.length > 0 && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                  <p className="font-semibold text-indigo-300">
                    💡 Recommended Action: {aiSummary.recommendations[0].title}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {aiSummary.recommendations[0].description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">
              Evaluating pipeline execution telemetry...
            </p>
          )}
        </Card>
      </div>

      {/* Recent Workflow Intake Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Requests & Workflow Intake</h3>
            <p className="text-xs text-slate-400">Live operational events logged in {activeOrg?.name}</p>
          </div>
          <Link to="/app/requests" className="text-xs text-indigo-400 hover:underline">
            View All Requests &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Req #</th>
                <th className="py-2.5 px-4 font-semibold">Title</th>
                <th className="py-2.5 px-4 font-semibold">Category</th>
                <th className="py-2.5 px-4 font-semibold">Requester</th>
                <th className="py-2.5 px-4 font-semibold">Amount</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No requests recorded yet. Create a request or click "Seed Demo Scenario".
                  </td>
                </tr>
              ) : (
                recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-400 font-sans">
                      #{req.requestNumber || "—"}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-100 max-w-xs truncate">
                      <Link to={`/app/requests/${req.id}`} className="hover:text-indigo-400 hover:underline">
                        {req.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 capitalize font-sans">{req.category}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{req.requesterName || "System"}</td>
                    <td className="py-3 px-4 text-emerald-400">
                      {req.amountMinor ? `₹${(req.amountMinor / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <Badge
                        variant={
                          req.status === "approved" || req.status === "completed"
                            ? "success"
                            : req.status === "awaiting_approval"
                            ? "warning"
                            : req.status === "rejected"
                            ? "danger"
                            : "default"
                        }
                        size="sm"
                      >
                        {req.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-sans text-[10px]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
