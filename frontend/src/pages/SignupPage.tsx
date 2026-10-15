import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
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
      }>("/auth/signup", {
        fullName,
        email,
        password,
        organizationName: organizationName || undefined,
      });

      // Automatically sign in
      const loginRes = await api.post<{
        token: string;
        user: any;
        organizations: any[];
        activeOrganization: any;
      }>("/auth/login", { email, password });

      login(loginRes.token, loginRes.user, loginRes.organizations, loginRes.activeOrganization);

      if (!loginRes.activeOrganization) {
        navigate("/onboarding");
      } else {
        navigate("/app/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please check your inputs.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-6 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-white">FlowPilot AI</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100 font-display">Create an Account</h2>
          <p className="text-xs text-slate-400 mt-1">Get started with intelligent workflow automation in minutes</p>
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
              label="Full Name"
              type="text"
              required
              placeholder="e.g. Alexander Scott"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="Work Email"
              type="email"
              required
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              required
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Organization Name (Optional)"
              type="text"
              placeholder="e.g. Nexa Systems Ltd"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              helperText="You can also join or create an organization after signing up"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:underline font-medium">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};
