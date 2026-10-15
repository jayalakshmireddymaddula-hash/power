import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, FilePlus2, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { v4 as uuidv4 } from "uuid";

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeOrg } = useAuth();

  const [departments, setDepartments] = useState<any[]>([]);

  // AI Unstructured input helper
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiAdvisory, setAiAdvisory] = useState<any>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("procurement");
  const [description, setDescription] = useState("");
  const [businessJustification, setBusinessJustification] = useState("");
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [currency, setCurrency] = useState("INR");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [neededBy, setNeededBy] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await api.get("/organizations/current/departments");
        setDepartments(data || []);
        if (data && data.length > 0) {
          setDepartmentId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepartments();
  }, []);

  // AI Request Structuring Handler
  const handleAiStructure = async () => {
    if (!naturalLanguageInput.trim()) return;
    setIsAiProcessing(true);
    setAiAdvisory(null);
    try {
      const res = await api.post<any>("/ai/structure-request", {
        unstructuredText: naturalLanguageInput,
      });

      const fields = res.suggested_fields || {};
      if (fields.title) setTitle(fields.title);
      if (fields.category) setCategory(fields.category);
      if (fields.amount_minor) setAmountRupees(String(fields.amount_minor / 100));
      if (fields.currency) setCurrency(fields.currency);
      if (fields.priority) setPriority(fields.priority);
      if (fields.business_justification) setBusinessJustification(fields.business_justification);

      setAiAdvisory(res);
    } catch (err: any) {
      alert("AI Structuring failed: " + err.message);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Real-time deterministic policy evaluation calculation
  const parsedAmount = parseFloat(amountRupees || "0");
  const amountMinor = Math.round(parsedAmount * 100);

  const getPolicyTierAdvice = () => {
    if (category !== "procurement" || !amountMinor || amountMinor <= 0) {
      return {
        text: "Standard operational workflow routing applies.",
        type: "neutral",
      };
    }
    if (amountMinor <= 500000) {
      return {
        text: "Tier 1: Single authorized approver review (Amount ≤ ₹5,000).",
        type: "success",
      };
    }
    if (amountMinor <= 2500000) {
      return {
        text: "Tier 2: Requires Department Manager Approval (₹5,000 to ₹25,000).",
        type: "warning",
      };
    }
    return {
      text: "Tier 3: Sequential 2-Stage Approval (Dept Manager followed by Executive Finance) for requests > ₹25,000.",
      type: "urgent",
    };
  };

  const policyAdvice = getPolicyTierAdvice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        title: title.trim(),
        category,
        description: description.trim(),
        businessJustification: businessJustification.trim(),
        priority,
        departmentId: departmentId || undefined,
        idempotencyKey: uuidv4(), // Prevent duplicate submission
      };

      if (category === "procurement") {
        if (!amountMinor || amountMinor <= 0) {
          throw new Error("Procurement purchase requests require a positive amount.");
        }
        payload.amountMinor = amountMinor;
        payload.currency = currency;
      }

      if (neededBy) {
        payload.neededBy = new Date(neededBy).toISOString();
      }

      const res = await api.post<{ id: string }>("/requests", payload);
      navigate(`/app/requests/${res.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit request. Please check required fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-display text-white">Intelligent Request Intake</h1>
        <p className="text-xs text-slate-400 mt-1">
          Submit purchase or operational requests. FlowPilot AI assists in structuring fields and evaluates routing policies deterministically.
        </p>
      </div>

      {/* AI Assistant Accordion Panel */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-slate-900">
        <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-2">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>AI-Assisted Form Completion</span>
          <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 ml-auto">
            Gemini Advisory
          </span>
        </div>
        <p className="text-xs text-slate-300 mb-3">
          Paste your requirement in plain English. FlowPilot AI will extract the item, amount, category, priority, and justification automatically for your review.
        </p>

        <div className="space-y-3">
          <textarea
            rows={2}
            value={naturalLanguageInput}
            onChange={(e) => setNaturalLanguageInput(e.target.value)}
            placeholder="e.g. We need to buy 2 Dell Precision 7680 workstations costing ₹2,10,000 for LLM inference testing in Engineering urgently."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              AI suggestions are advisory. You must review and confirm fields below before submitting.
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAiStructure}
              isLoading={isAiProcessing}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Suggest Fields with AI
            </Button>
          </div>
        </div>

        {aiAdvisory && (
          <div className="mt-4 pt-3 border-t border-indigo-500/20 text-xs flex items-center gap-3 text-indigo-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Fields populated with {Math.round((aiAdvisory.confidence || 0.9) * 100)}% model confidence. Please verify values below.
            </span>
          </div>
        )}
      </Card>

      {/* Main Intake Form */}
      <Card>
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Request Title *"
              required
              placeholder="e.g. Dell Precision Workstations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="procurement">Procurement (Purchase Request)</option>
                <option value="hr">Human Resources & Onboarding</option>
                <option value="operations">Operations & Facilities</option>
                <option value="document_processing">Document Processing</option>
                <option value="it_support">IT Support & Infrastructure</option>
                <option value="finance">Finance & Budget</option>
              </select>
            </div>
          </div>

          {/* Amount fields for Procurement */}
          {category === "procurement" && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Estimated Amount (in Rupees) *"
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 45000"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  helperText={
                    amountMinor > 0
                      ? `Stored in minor units: ${amountMinor} paise (₹${parsedAmount.toLocaleString("en-IN")})`
                      : "Required for procurement routing"
                  }
                />

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="INR">INR (₹) — Indian Rupee</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>
              </div>

              {/* Live Deterministic Policy Preview */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  policyAdvice.type === "urgent"
                    ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                    : policyAdvice.type === "warning"
                    ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                    : "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Routing Policy Evaluation:</strong> {policyAdvice.text}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Detailed Description *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete specifications, model numbers, quantities, or scope..."
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Business Justification *</label>
            <textarea
              rows={2}
              required
              value={businessJustification}
              onChange={(e) => setBusinessJustification(e.target.value)}
              placeholder="Why is this purchase required? State project necessity, team benefit, or client deliverable..."
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <Input
              label="Needed By (Optional)"
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" size="md" onClick={() => navigate("/app/requests")}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Submit & Execute Workflow
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
