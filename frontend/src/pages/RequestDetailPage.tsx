import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Activity,
  User,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export const RequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequestDetails = async () => {
    if (!requestId) return;
    setIsLoading(true);
    try {
      const data = await api.get(`/requests/${requestId}`);
      setRequest(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    setActionLoading(true);
    try {
      await api.post(`/requests/${requestId}/cancel`);
      await fetchRequestDetails();
    } catch (err: any) {
      alert("Failed to cancel: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <Activity className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
        <span>Loading request details and execution timeline...</span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <p>Request not found.</p>
        <Link to="/app/requests" className="text-indigo-400 underline mt-2 inline-block">
          Return to requests
        </Link>
      </div>
    );
  }

  const latestExecution = request.executions?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top back link and action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/app/requests")}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </button>

        {request.status !== "completed" && request.status !== "cancelled" && request.status !== "rejected" && (
          <Button variant="danger" size="sm" onClick={handleCancel} isLoading={actionLoading}>
            Cancel Request
          </Button>
        )}
      </div>

      {/* Main Request Header Card */}
      <Card className="border-slate-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="font-mono text-xs font-bold text-slate-400">
                REQ-#{request.requestNumber || "—"}
              </span>
              <Badge
                variant={
                  request.status === "approved" || request.status === "completed"
                    ? "success"
                    : request.status === "awaiting_approval"
                    ? "warning"
                    : request.status === "rejected"
                    ? "danger"
                    : "default"
                }
              >
                {request.status?.replace("_", " ")}
              </Badge>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                {request.priority} Priority
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-display text-white">{request.title}</h1>
          </div>

          {request.amountMinor && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Requested Amount</p>
              <p className="text-2xl md:text-3xl font-extrabold text-emerald-400 font-mono">
                ₹{(request.amountMinor / 100).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {request.amountMinor} paise ({request.currency})
              </p>
            </div>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-800/80">
          <div>
            <span className="text-slate-400 block text-[11px]">Category</span>
            <span className="font-medium text-slate-200 capitalize">{request.category}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Submitted By</span>
            <span className="font-medium text-slate-200">{request.requesterName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Department</span>
            <span className="font-medium text-slate-200">{request.departmentName || "General"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Submitted At</span>
            <span className="font-medium text-slate-200 font-mono">
              {new Date(request.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Description & Justification */}
        <div className="pt-4 space-y-3 text-xs">
          <div>
            <h4 className="font-semibold text-slate-300 mb-1">Specifications & Description:</h4>
            <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              {request.description}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-1">Business Justification:</h4>
            <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              {request.businessJustification || "No business justification specified."}
            </p>
          </div>
        </div>
      </Card>

      {/* Human Approval Status Section */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Approval Stage Review & Decisions</h3>
        </div>

        <div className="space-y-3">
          {(!request.approvalTasks || request.approvalTasks.length === 0) ? (
            <p className="text-xs text-slate-500 py-3">No approval tasks generated for this request.</p>
          ) : (
            request.approvalTasks.map((t: any) => (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Stage {t.stage}: {t.required_role?.toUpperCase()} REVIEW</span>
                    <Badge
                      variant={
                        t.status === "approved"
                          ? "success"
                          : t.status === "pending"
                          ? "warning"
                          : "danger"
                      }
                      size="sm"
                    >
                      {t.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
                    <span>Assigned to: {t.assigned_to_name || "Authorized Pool"}</span>
                    {t.decided_at && (
                      <span>
                        Decided by: <strong>{t.decided_by_name}</strong> on{" "}
                        {new Date(t.decided_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {t.decision_comment && (
                    <p className="text-[11px] text-slate-300 mt-2 bg-slate-950 p-2 rounded border border-slate-800">
                      Decision Note: "{t.decision_comment}"
                    </p>
                  )}
                </div>

                {t.status === "pending" && (
                  <Link to={`/app/approvals/${t.id}`}>
                    <Button variant="primary" size="sm">
                      Review & Decide
                    </Button>
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Node-by-Node Workflow Execution Steps Timeline */}
      {latestExecution && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Execution Timeline & Step Trace</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Execution: {latestExecution.id.slice(0, 8)}...
            </span>
          </div>

          <div className="space-y-4">
            {latestExecution.steps && latestExecution.steps.length > 0 ? (
              latestExecution.steps.map((s: any, idx: number) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px] text-indigo-400 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {s.node_id} ({s.node_type})
                      </span>
                      <Badge
                        variant={
                          s.status === "completed"
                            ? "success"
                            : s.status === "waiting"
                            ? "warning"
                            : s.status === "failed"
                            ? "danger"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {s.status}
                      </Badge>
                    </div>

                    {s.output_data && (
                      <pre className="mt-2 p-2 bg-slate-950 rounded text-[10px] text-slate-400 overflow-x-auto font-mono">
                        {typeof s.output_data === "string" ? s.output_data : JSON.stringify(s.output_data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                Workflow steps currently executing...
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Immutable Application Audit Trail */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Application Audit Trail</h3>
        </div>
        <div className="space-y-2">
          {(!request.auditEvents || request.auditEvents.length === 0) ? (
            <p className="text-xs text-slate-500 py-2">No audit events recorded.</p>
          ) : (
            request.auditEvents.map((ae: any) => (
              <div
                key={ae.id}
                className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px] flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-indigo-400 font-semibold">{ae.action}</span>
                  <span className="text-slate-400 ml-2">by {ae.actor_name || ae.actor_type}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px]">
                  {new Date(ae.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
