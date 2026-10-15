import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  CheckCircle2,
  GitFork,
  Activity,
  ListTodo,
  FileText,
  BarChart3,
  Settings,
  Sparkles,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/Badge";

export interface SidebarProps {
  pendingApprovalsCount?: number;
  unreadNotificationsCount?: number;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pendingApprovalsCount = 0,
  onCloseMobile,
}) => {
  const { user, activeOrg, organizations, switchOrganization, role } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
    { label: "Requests", path: "/app/requests", icon: FilePlus2 },
    {
      label: "Approvals",
      path: "/app/approvals",
      icon: CheckCircle2,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeVariant: "warning" as const,
    },
    { label: "Workflows", path: "/app/workflows", icon: GitFork },
    { label: "Executions", path: "/app/executions", icon: Activity },
    { label: "Task Center", path: "/app/tasks", icon: ListTodo },
    { label: "Document Hub", path: "/app/documents", icon: FileText },
    { label: "Reports & KPIs", path: "/app/reports", icon: BarChart3 },
    { label: "Settings", path: "/app/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      {/* Brand & Organization */}
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg text-white tracking-tight">FlowPilot</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">AI</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Smart Automation Platform</p>
          </div>
        </div>

        {/* Organization Switcher */}
        {activeOrg && (
          <div className="px-3 py-3 border-b border-slate-800/50">
            <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-200 truncate">{activeOrg.name}</p>
                  <p className="text-[10px] text-indigo-400 font-mono capitalize">{role} access</p>
                </div>
              </div>
              {organizations.length > 1 && (
                <select
                  aria-label="Switch Organization"
                  className="absolute opacity-0 inset-0 cursor-pointer"
                  value={activeOrg.id}
                  onChange={(e) => switchOrganization(e.target.value)}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.role})
                    </option>
                  ))}
                </select>
              )}
              {organizations.length > 1 && <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <Badge variant={item.badgeVariant || "default"} size="sm">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-800/60 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
            {user?.fullName?.slice(0, 2).toUpperCase() || "FP"}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.fullName || "User"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
