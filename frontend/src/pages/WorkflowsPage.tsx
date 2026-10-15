import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GitFork,
  Plus,
  Play,
  Pause,
  Copy,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { WORKFLOW_TEMPLATES } from "@flowpilot/shared";

export const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeOrg } = useAuth();

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>(WORKFLOW_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await api.get("/workflows");
      setWorkflows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [activeOrg?.id]);

  const handleToggleStatus = async (workflow: any) => {
    setActionId(workflow.id);
    try {
      const endpoint = workflow.status === "active" ? `/workflows/${workflow.id}/pause` : `/workflows/${workflow.id}/activate`;
      await api.post(endpoint);
      await fetchWorkflows();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicate = async (workflowId: string) => {
    setActionId(workflowId);
    try {
      const res = await api.post<{ id: string }>(`/workflows/${workflowId}/duplicate`);
      navigate(`/app/workflows/${res.id}`);
    } catch (err: any) {
      alert("Failed to duplicate: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleInstantiateTemplate = async (template: any) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ id: string }>("/workflows", {
        name: template.name,
        description: template.description,
        category: template.category,
        definition: template.definition,
      });

      // Automatically publish and activate
      await api.post(`/workflows/${res.id}/publish`);
      await api.post(`/workflows/${res.id}/activate`);
      await fetchWorkflows();
      navigate(`/app/workflows/${res.id}`);
    } catch (err: any) {
      alert("Failed to instantiate template: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Workflow Automation Hub</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure declarative DAG automation pipelines, define conditions, and manage immutable versions.
          </p>
        </div>

        <Link to="/app/workflows/new">
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Create Workflow
          </Button>
        </Link>
      </div>

      {/* Active Workflows Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <GitFork className="w-4 h-4 text-indigo-400" />
          <span>Active Organization Workflows ({workflows.length})</span>
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <Card key={wf.id} className="flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {wf.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400">v{wf.currentPublishedVersion || 1}</span>
                    <Badge
                      variant={wf.status === "active" ? "success" : wf.status === "draft" ? "warning" : "neutral"}
                      size="sm"
                    >
                      {wf.status}
                    </Badge>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-1.5 line-clamp-1">{wf.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">{wf.description || "No description provided."}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] font-mono">{wf.executionCount || 0} executions</span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(wf)}
                    disabled={actionId === wf.id}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title={wf.status === "active" ? "Pause workflow" : "Activate workflow"}
                  >
                    {wf.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => handleDuplicate(wf.id)}
                    disabled={actionId === wf.id}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Duplicate workflow"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <Link to={`/app/workflows/${wf.id}`}>
                    <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5">
                      Designer
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pre-built Reusable Templates Section */}
      <div className="pt-6 border-t border-slate-800">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white">Pre-built Workflow Templates</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Instantly deploy validated enterprise workflows with declarative nodes and server handlers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-4 border-slate-800 bg-slate-900/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">
                  {tpl.category}
                </span>
                <h4 className="text-sm font-semibold text-slate-100 mt-1 mb-1.5">{tpl.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">{tpl.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  {tpl.definition.nodes?.length} Nodes · {tpl.definition.edges?.length} Edges
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => handleInstantiateTemplate(tpl)}
                >
                  Use Template
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
