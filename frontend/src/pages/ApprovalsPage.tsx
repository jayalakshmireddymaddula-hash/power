import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";

export const ApprovalsPage: React.FC = () => {
  const { user, activeOrg, role } = useAuth();

  const [approvals, setApprovals] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const data = await api.get("/approvals?status=pending");
      setApprovals(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeOrg?.id]);

  const handleDecision = async (action: "approve" | "reject" | "request-changes") => {
    if (!selectedTask) return;
    setError(null);
    setIsDeciding(true);

    try {
      let endpoint = `/approvals/${selectedTask.id}/approve`;
      if (action === "reject") endpoint = `/approvals/${selectedTask.id}/reject`;
      if (action === "request-changes") endpoint = `/approvals/${selectedTask.id}/request-changes`;

      await api.post(endpoint, { comment: decisionComment });
      setSelectedTask(null);
      setDecisionComment("");
      await fetchApprovals();
    } catch (err: any) {
      setError(err.message || "Failed to record approval decision.");
    } finally {
      setIsDeciding(false);
    }
  };

  const isSelfApproval = selectedTask && selectedTask.requestedBy === user?.id;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
            <span>Human Approval Inbox</span>
            {approvals.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                {approvals.length} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review policy-governed requests requiring human sign-off. AI recommendations are strictly advisory.
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          className="self-start sm:self-auto p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Approvals Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Request</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Requester</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Stage</th>
                <th className="py-3 px-4 font-semibold">Required Role</th>
                <th className="py-3 px-4 font-semibold">Due SLA</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No pending approval tasks! Your approval queue is completely clear.
                  </td>
                </tr>
              ) : (
                approvals.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-100 max-w-xs truncate">
                      <Link to={`/app/requests/${task.requestId}`} className="hover:text-indigo-400 hover:underline">
                        {task.requestTitle}
                      </Link>
                    </td>
                    <td className="py-3 px-4 capitalize">{task.requestCategory}</td>
                    <td className="py-3 px-4">{task.requesterName}</td>
                    <td className="py-3 px-4 text-emerald-400 font-mono font-semibold">
                      {task.amountMinor ? `₹${(task.amountMinor / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="warning" size="sm">
                        Stage {task.stage}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-mono text-slate-400">
                      {task.requiredRole}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "48 Hours"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setDecisionComment("");
                          setError(null);
                        }}
                      >
                        Review & Decide
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Decision Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={`Review Approval Task: Stage ${selectedTask.stage}`}
          description={`Request: ${selectedTask.requestTitle}`}
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs text-slate-300">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Self-Approval Warning */}
            {isSelfApproval && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Self-Approval Protection Active</p>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    Organizational policy prevents you from approving your own purchase request. Another authorized approver must sign off.
                  </p>
                </div>
              </div>
            )}

            {/* Request Summary Box */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Expenditure:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {selectedTask.amountMinor
                    ? `₹${(selectedTask.amountMinor / 100).toLocaleString("en-IN")} INR`
                    : "Non-monetary request"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Requester:</span>
                <span className="text-slate-200">{selectedTask.requesterName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Required Role:</span>
                <span className="text-indigo-400 uppercase font-mono font-semibold">
                  {selectedTask.requiredRole}
                </span>
              </div>
            </div>

            {/* Decision Comment */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Decision Notes / Justification:
              </label>
              <textarea
                rows={3}
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                placeholder="Add audit comments or reason for decision (mandatory if rejecting or requesting changes)..."
                className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTask(null)}
                disabled={isDeciding}
              >
                Close
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecision("request-changes")}
                disabled={isDeciding}
                isLoading={isDeciding}
              >
                Request Changes
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDecision("reject")}
                disabled={isDeciding}
                isLoading={isDeciding}
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
              >
                Reject Request
              </Button>

              <Button
                variant="success"
                size="sm"
                onClick={() => handleDecision("approve")}
                disabled={isDeciding || isSelfApproval}
                isLoading={isDeciding}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Authorize & Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
