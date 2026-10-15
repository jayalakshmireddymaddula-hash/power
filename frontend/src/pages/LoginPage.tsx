import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, UserCheck, ShieldAlert, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post<{
        token: string;
        user: any;
        organizations: any[];
        activeOrganization: any;
      }>("/auth/login", { email, password });

      login(res.token, res.user, res.organizations, res.activeOrganization);
      navigate("/app/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("flowpilot123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-6 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-white">FlowPilot AI</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100 font-display">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to access your organization workflows and approvals</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-800/80">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Platform
            </Button>
          </form>

          {/* Quick Demo Roles Filler */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Demo Quick-Fill Personas:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoFill("admin@flowpilot.ai")}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <p className="font-semibold text-indigo-300 group-hover:text-indigo-200">Sarah Chen</p>
                <p className="text-[10px] text-slate-400">Admin / Owner</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill("manager@flowpilot.ai")}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <p className="font-semibold text-emerald-300 group-hover:text-emerald-200">Marcus Vance</p>
                <p className="text-[10px] text-slate-400">Dept Manager</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill("approver@flowpilot.ai")}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <p className="font-semibold text-amber-300 group-hover:text-amber-200">Elena Rostova</p>
                <p className="text-[10px] text-slate-400">Senior Approver</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill("employee@flowpilot.ai")}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <p className="font-semibold text-sky-300 group-hover:text-sky-200">Arun Kumar</p>
                <p className="text-[10px] text-slate-400">Employee Requester</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account yet?{" "}
          <Link to="/signup" className="text-indigo-400 hover:underline font-medium">
            Register your organization
          </Link>
        </p>
      </div>
    </div>
  );
};
