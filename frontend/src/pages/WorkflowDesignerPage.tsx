import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  Code,
  Zap,
  Play,
  Settings2,
  GitCommit,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType } from "@flowpilot/shared";

const NODE_PALETTE: { type: NodeType; label: string; desc: string; color: string }[] = [
  { type: "trigger", label: "Trigger Event", desc: "Initiates workflow execution", color: "border-indigo-500 bg-indigo-950/40 text-indigo-300" },
  { type: "ai_classify", label: "AI Classification", desc: "Gemini category & priority advisory", color: "border-violet-500 bg-violet-950/40 text-violet-300" },
  { type: "condition", label: "Condition Branch", desc: "Evaluates deterministic policy logic", color: "border-amber-500 bg-amber-950/40 text-amber-300" },
  { type: "approval", label: "Human Approval", desc: "Pauses execution for authorized sign-off", color: "border-emerald-500 bg-emerald-950/40 text-emerald-300" },
  { type: "assign_task", label: "Assign Task", desc: "Creates task in operational task board", color: "border-sky-500 bg-sky-950/40 text-sky-300" },
  { type: "notification", label: "Notification", desc: "Dispatches in-app notification alert", color: "border-blue-500 bg-blue-950/40 text-blue-300" },
  { type: "delay", label: "Delay / SLA Window", desc: "Schedules resumption after delay", color: "border-slate-500 bg-slate-900/60 text-slate-300" },
  { type: "end", label: "Completion End", desc: "Finalizes execution & logs metrics", color: "border-rose-500 bg-rose-950/40 text-rose-300" },
];

export const WorkflowDesignerPage: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { activeOrg } = useAuth();

  const [workflowName, setWorkflowName] = useState("New Automation Pipeline");
  const [category, setCategory] = useState("procurement");
  const [status, setStatus] = useState("draft");
  const [publishedVersion, setPublishedVersion] = useState(1);

  // Workflow graph state
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: "node_trigger", type: "trigger", name: "Request Submitted", config: { event: "request.submitted" }, position: { x: 50, y: 150 } },
    { id: "node_end", type: "end", name: "Workflow Completed", config: {}, position: { x: 450, y: 150 } },
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([
    { id: "e1", source: "node_trigger", target: "node_end" },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!workflowId || workflowId === "new") return;

    const fetchWorkflow = async () => {
      try {
        const wf = await api.get(`/workflows/${workflowId}`);
        setWorkflowName(wf.name);
        setCategory(wf.category);
        setStatus(wf.status);
        setPublishedVersion(wf.currentPublishedVersion || 1);

        if (wf.definition && wf.definition.nodes) {
          setNodes(wf.definition.nodes);
          setEdges(wf.definition.edges || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkflow();
  }, [workflowId]);

  const handleAddNode = (type: NodeType) => {
    const newId = `node_${type}_${Date.now().toString().slice(-4)}`;
    const newNode: WorkflowNode = {
      id: newId,
      type,
      name: `${type.replace("_", " ").toUpperCase()}`,
      config: type === "condition" ? { field: "amountMinor", operator: "greater_than", value: 500000 } : {},
      position: { x: 250, y: 150 + (nodes.length * 20) },
    };

    setNodes([...nodes, newNode]);
    setSelectedNodeId(newId);
  };

  const handleRemoveNode = (id: string) => {
    if (nodes.length <= 2) {
      alert("Workflow must retain at least a trigger and an end node.");
      return;
    }
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleConnectNodes = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    if (edges.some((e) => e.source === sourceId && e.target === targetId)) return;

    const newEdge: WorkflowEdge = {
      id: `e_${sourceId}_${targetId}`,
      source: sourceId,
      target: targetId,
    };
    setEdges([...edges, newEdge]);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const definition: WorkflowDefinition = {
        nodes,
        edges,
        metadata: { updatedAt: new Date().toISOString() },
      };

      if (!workflowId || workflowId === "new") {
        const res = await api.post<{ id: string }>("/workflows", {
          name: workflowName,
          category,
          definition,
        });
        navigate(`/app/workflows/${res.id}`, { replace: true });
      } else {
        await api.patch(`/workflows/${workflowId}`, {
          name: workflowName,
          category,
          definition,
        });
      }
      setFeedbackMsg({ type: "success", text: "Draft saved successfully." });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to save draft." });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workflowId || workflowId === "new") {
      alert("Please save draft first before publishing.");
      return;
    }
    setIsPublishing(true);
    setFeedbackMsg(null);
    try {
      // First save latest definition
      await api.patch(`/workflows/${workflowId}`, {
        name: workflowName,
        category,
        definition: { nodes, edges, metadata: {} },
      });

      const res = await api.post<{ publishedVersion: number }>(`/workflows/${workflowId}/publish`);
      setPublishedVersion(res.publishedVersion);
      setStatus("active");
      setFeedbackMsg({ type: "success", text: `Published immutable version v${res.publishedVersion} successfully!` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Publication failed graph validation." });
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="space-y-4 animate-fade-in pb-12 font-sans">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/app/workflows")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-lg font-bold font-display text-white bg-transparent border-b border-dashed border-slate-700 hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
              />
              <Badge variant={status === "active" ? "success" : "warning"} size="sm">
                v{publishedVersion} · {status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Category: {category} | DAG Engine Validated</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJson(!showJson)}
            leftIcon={<Code className="w-3.5 h-3.5" />}
          >
            {showJson ? "Canvas View" : "JSON Preview"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            isLoading={isSaving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Draft
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            isLoading={isPublishing}
            leftIcon={<GitCommit className="w-3.5 h-3.5" />}
          >
            Publish Version
          </Button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedbackMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {showJson ? (
        /* JSON Definition View */
        <Card className="p-4 bg-slate-950 font-mono text-xs">
          <pre className="text-slate-300 overflow-x-auto max-h-[600px]">
            {JSON.stringify({ nodes, edges }, null, 2)}
          </pre>
        </Card>
      ) : (
        /* Visual Canvas & Inspector Layout */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
          {/* Node Palette (Left sidebar) */}
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                Node Library
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Click any component node to add it to your automation graph.
              </p>
              <div className="space-y-2">
                {NODE_PALETTE.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddNode(item.type)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 transition-all text-xs flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-semibold text-slate-200 group-hover:text-indigo-300">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Interactive Visual Canvas (Center) */}
          <div className="lg:col-span-2">
            <Card className="p-4 bg-[#0a0f1d] border-slate-800 min-h-[600px] relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4 text-xs text-slate-400">
                <span>Active Graph Nodes: {nodes.length} | Edges: {edges.length}</span>
                <span className="text-[11px] text-indigo-400 font-mono">Directed Acyclic Graph</span>
              </div>

              {/* Node cards layout */}
              <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
                {nodes.map((node, index) => {
                  const isSelected = selectedNodeId === node.id;
                  const outgoingEdges = edges.filter((e) => e.source === node.id);

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500"
                          : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-400">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-xs text-white">{node.name}</span>
                          <Badge variant="neutral" size="sm">
                            {node.type}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveNode(node.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Remove node"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Node connection info */}
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                        <span>Connects to:</span>
                        {outgoingEdges.length > 0 ? (
                          outgoingEdges.map((e) => (
                            <span
                              key={e.id}
                              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                            >
                              &rarr; {e.target} {e.conditionHandle ? `(${e.conditionHandle})` : ""}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">Terminal point</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Connect Helper */}
              <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                <span>Connect step:</span>
                <select
                  id="connectSource"
                  aria-label="Select source node"
                  className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded text-[11px]"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
                <span>&rarr;</span>
                <select
                  id="connectTarget"
                  aria-label="Select target node"
                  className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded text-[11px]"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2 ml-auto"
                  onClick={() => {
                    const src = (document.getElementById("connectSource") as HTMLSelectElement)?.value;
                    const tgt = (document.getElementById("connectTarget") as HTMLSelectElement)?.value;
                    if (src && tgt) handleConnectNodes(src, tgt);
                  }}
                >
                  Link Steps
                </Button>
              </div>
            </Card>
          </div>

          {/* Node Configuration Drawer (Right) */}
          <div>
            <Card className="p-4">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                <span>Node Properties</span>
              </h4>

              {selectedNode ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Node Title</label>
                    <input
                      type="text"
                      value={selectedNode.name}
                      onChange={(e) => {
                        const updated = nodes.map((n) => (n.id === selectedNode.id ? { ...n, name: e.target.value } : n));
                        setNodes(updated);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                    />
                  </div>

                  {selectedNode.type === "condition" && (
                    <div className="space-y-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                      <p className="font-semibold text-amber-300">Condition Thresholds</p>
                      <div>
                        <label className="text-slate-400 block mb-1">Target Field</label>
                        <input
                          type="text"
                          value={(selectedNode.config.field as string) || "amountMinor"}
                          onChange={(e) => {
                            const updated = nodes.map((n) =>
                              n.id === selectedNode.id ? { ...n, config: { ...n.config, field: e.target.value } } : n
                            );
                            setNodes(updated);
                          }}
                          className="w-full px-3 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Threshold Minor Units (Paise)</label>
                        <input
                          type="number"
                          value={(selectedNode.config.value as number) || 500000}
                          onChange={(e) => {
                            const updated = nodes.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, value: parseInt(e.target.value, 10) || 0 } }
                                : n
                            );
                            setNodes(updated);
                          }}
                          className="w-full px-3 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.type === "approval" && (
                    <div className="space-y-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                      <p className="font-semibold text-emerald-300">Approval Settings</p>
                      <div>
                        <label className="text-slate-400 block mb-1">Required Role</label>
                        <select
                          value={(selectedNode.config.requiredRole as string) || "manager"}
                          onChange={(e) => {
                            const updated = nodes.map((n) =>
                              n.id === selectedNode.id ? { ...n, config: { ...n.config, requiredRole: e.target.value } } : n
                            );
                            setNodes(updated);
                          }}
                          className="w-full px-3 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
                        >
                          <option value="approver">Approver</option>
                          <option value="manager">Department Manager</option>
                          <option value="admin">Admin / Finance</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-[10px] text-slate-500">
                    Node ID: <code>{selectedNode.id}</code>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Select a node on the canvas to configure properties and policy thresholds.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
