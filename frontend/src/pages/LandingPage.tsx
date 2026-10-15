import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  GitFork,
  CheckCircle2,
  Clock,
  Layers,
  BarChart4,
} from "lucide-react";
import { Button } from "../components/ui/Button";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col selection:bg-indigo-500/30 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-xl tracking-tight text-white">FlowPilot</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Smart Automation Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 overflow-hidden">
        {/* Glow Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/20 to-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 animate-fade-in shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automate the Busywork. Accelerate the Work.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 font-display leading-[1.1]">
            Intelligent Automation for <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200">
              Modern Enterprise Workflows
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Eliminate repetitive operational bottlenecks with AI-powered request intake, deterministic policy routing, multi-tier approvals, and real-time observability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/login">
              <Button variant="primary" size="lg" className="px-8 shadow-xl shadow-indigo-500/25">
                Launch Live Platform Demo
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="secondary" size="lg" className="px-8">
                Create Organization
              </Button>
            </Link>
          </div>

          {/* Metric Highlights Pill */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-4 rounded-xl glass-card">
              <p className="text-xs text-slate-400">Time Saved</p>
              <p className="text-2xl font-bold text-indigo-400 font-display">85%</p>
              <p className="text-[11px] text-slate-400 mt-1">Faster approval turnaround</p>
            </div>
            <div className="p-4 rounded-xl glass-card">
              <p className="text-xs text-slate-400">Policy Accuracy</p>
              <p className="text-2xl font-bold text-emerald-400 font-display">100%</p>
              <p className="text-[11px] text-slate-400 mt-1">Deterministic server rules</p>
            </div>
            <div className="p-4 rounded-xl glass-card">
              <p className="text-xs text-slate-400">Workflow Engine</p>
              <p className="text-2xl font-bold text-violet-400 font-display">DAG</p>
              <p className="text-[11px] text-slate-400 mt-1">Immutable version control</p>
            </div>
            <div className="p-4 rounded-xl glass-card">
              <p className="text-xs text-slate-400">Human-in-Loop</p>
              <p className="text-2xl font-bold text-sky-400 font-display">Strict</p>
              <p className="text-[11px] text-slate-400 mt-1">Zero unauthorized AI actions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Feature Showcase */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white font-display mb-4">
              Engineered for Enterprise Operational Rigor
            </h2>
            <p className="text-slate-400 text-sm">
              FlowPilot AI pairs Google Gemini advisory intelligence with deterministic business logic so your organization moves fast without compromising control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl glass-card hover:border-indigo-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">AI-Assisted Request Intake</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste raw requirements in natural language. FlowPilot AI structures amounts, assigns categories, flags risk anomalies, and validates completeness before submission.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl glass-card hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Deterministic Policy Routing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Threshold rules evaluate integer minor units (paise/cents) without floating-point inaccuracies. Multi-tier approval routing executes with strict self-approval prevention.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl glass-card hover:border-violet-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-5">
                <GitFork className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Visual Workflow Designer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Author declarative workflows with condition branches, human approvals, task dispatch, delays, and reporting. Validates acyclic graph integrity and publishes immutable versions.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl glass-card hover:border-amber-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Human-in-the-Loop Inbox</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Approvers review evidence-backed AI recommendations, policy citations, and budget details to approve, reject with reason, or request revisions transactionally.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl glass-card hover:border-sky-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Durable Execution Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Database-backed job queue with atomic lease locks, bounded exponential backoff retries, and step-by-step auditing that survives system restarts seamlessly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl glass-card hover:border-rose-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
                <BarChart4 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Bottleneck AI Analysis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Identifies operational delays from verified SQL data. Gemini recommends targeted SLA improvements while protecting against spreadsheet formula injection in CSV exports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 px-6 bg-slate-950 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 FlowPilot AI Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-indigo-400 font-mono text-[11px]">Powered by Google Gemini (@google/genai)</span>
            <Link to="/login" className="hover:text-slate-100">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
