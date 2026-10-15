import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post<{ id: string }>("/organizations", {
        name: orgName.trim(),
        settings: {
          defaultCurrency: currency,
          allowSelfApproval: false,
          autoRemindOverdueHours: 24,
        },
      });

      localStorage.setItem("flowpilot_active_org", res.id);
      await refreshSession();

      // Seed templates if desired
      try {
        await api.post("/demo/seed");
      } catch {}

      navigate("/app/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create organization. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-6 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white">Create Your Organization</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Set up your organization workspace to start designing workflows and managing approval policies.
          </p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-800/80">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Organization Name"
              type="text"
              required
              placeholder="e.g. Apex Corporation"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Primary Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900/80 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="INR">INR (₹) — Indian Rupee (Minor Unit: Paise)</option>
                <option value="USD">USD ($) — United States Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-200">Includes 6 Ready-to-Use Workflow Templates</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Includes Multi-tier Purchase Approvals, Document AI Extraction, Onboarding, and SLA Escalation.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Initialize Workspace
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
