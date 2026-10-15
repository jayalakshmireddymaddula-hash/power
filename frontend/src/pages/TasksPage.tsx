import React, { useState, useEffect } from "react";
import { ListTodo, Plus, CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

export const TasksPage: React.FC = () => {
  const { activeOrg, user } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [dueAt, setDueAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const endpoint = filterStatus ? `/tasks?status=${filterStatus}` : "/tasks";
      const data = await api.get(endpoint);
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filterStatus, activeOrg?.id]);

  const handleToggleComplete = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/complete`);
      await fetchTasks();
    } catch (err: any) {
      alert("Failed to complete task: " + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post("/tasks", {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });

      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      await fetchTasks();
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
            <ListTodo className="w-6 h-6 text-indigo-400" />
            <span>Operational Task Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track workflow-assigned and manual operational tasks, assignments, and due SLAs.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Task
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilterStatus("")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === "" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === "pending" ? "bg-amber-600/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === "completed" ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            Completed
          </button>
        </div>

        <button
          onClick={fetchTasks}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Task Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs">
            No operational tasks found for this view. Click "New Task" to create one.
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="flex flex-col justify-between hover:border-slate-700 transition-all text-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant={
                      task.priority === "urgent"
                        ? "danger"
                        : task.priority === "high"
                        ? "warning"
                        : "neutral"
                    }
                    size="sm"
                  >
                    {task.priority}
                  </Badge>

                  <Badge variant={task.status === "completed" ? "success" : "neutral"} size="sm">
                    {task.status}
                  </Badge>
                </div>

                <h4 className="font-semibold text-white text-sm mb-1">{task.title}</h4>
                <p className="text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {task.description || "No additional description."}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No deadline"}
                </span>

                {task.status !== "completed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => handleToggleComplete(task.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  >
                    Complete
                  </Button>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Operational Task"
          description="Assign manual or follow-up action items"
        >
          <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
            <Input
              label="Task Title *"
              required
              placeholder="e.g. Verify SOC-2 Vendor Compliance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the operational task..."
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <Input
                label="Due Date"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
