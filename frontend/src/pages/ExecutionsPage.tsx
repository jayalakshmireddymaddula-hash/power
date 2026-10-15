import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, RefreshCw, CheckCircle2, Clock, XCircle, RotateCcw, Eye, Layers } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";

export const ExecutionsPage: React.FC = () => {
  const { activeOrg } = useAuth();

  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const data = await api.get("/executions");
      setExecutions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [activeOrg?.id]);

  const handleViewExecution = async (id: string) => {
    try {
      const details = await api.get(`/executions/${id}`);
      setSelectedExecution(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await api.post(`/executions/${id}/retry`);
      await fetchExecutions();
    } catch (err: any) {
      alert("Retry failed: " + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "running":
        return <Badge variant="info">Running</Badge>;
      case "waiting_approval":
        return <Badge variant="warning">Waiting Approval</Badge>;
      case "waiting_delay":
        return <Badge variant="warning">Waiting Delay</Badge>;
      case "failed":
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            <span>Workflow Executions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time execution telemetry, step inputs/outputs, error recovery, and audit records.
          </p>
        </div>

        <button
          onClick={fetchExecutions}
          className="self-start sm:self-auto p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Execution ID</th>
                <th className="py-3 px-4 font-semibold">Workflow</th>
                <th className="py-3 px-4 font-semibold">Request Link</th>
                <th className="py-3 px-4 font-semibold">Current Step</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Started At</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No execution records logged. Submit a request or seed demo scenarios from the dashboard.
                  </td>
                </tr>
              ) : (
                executions.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 font-bold">
                      {e.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{e.workflowName}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {e.requestId ? (
                        <Link to={`/app/requests/${e.requestId}`} className="hover:text-indigo-400 hover:underline">
                          {e.requestTitle || "View Request"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {e.currentNodeId || "Completed"}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(e.status)}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(e.startedAt || e.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {e.status === "failed" && (
                          <Button
                            variant="danger"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => handleRetry(e.id)}
                            isLoading={retryingId === e.id}
                            leftIcon={<RotateCcw className="w-3 h-3" />}
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleViewExecution(e.id)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Execution Step Inspector Modal */}
      {selectedExecution && (
        <Modal
          isOpen={!!selectedExecution}
          onClose={() => setSelectedExecution(null)}
          title={`Execution Trace: ${selectedExecution.workflowName}`}
          description={`ID: ${selectedExecution.id}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Execution Status</span>
                <span className="font-semibold text-slate-200 capitalize">{selectedExecution.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Current Step</span>
                <span className="font-mono text-indigo-400 font-semibold">{selectedExecution.current_node_id || "end"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Started At</span>
                <span className="font-mono text-slate-300">{new Date(selectedExecution.started_at).toLocaleTimeString()}</span>
              </div>
            </div>

            <h4 className="font-semibold text-slate-200 pt-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Step-by-Step Node Trace ({selectedExecution.steps?.length || 0} Steps)</span>
            </h4>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {selectedExecution.steps?.map((step: any, index: number) => (
                <div key={step.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      Step {index + 1}: {step.node_id} ({step.node_type})
                    </span>
                    <Badge variant={step.status === "completed" ? "success" : step.status === "waiting" ? "warning" : "danger"}>
                      {step.status}
                    </Badge>
                  </div>
                  {step.outputData && (
                    <pre className="p-2 bg-slate-950 rounded text-[10px] font-mono text-slate-400 overflow-x-auto">
                      {JSON.stringify(step.outputData, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
