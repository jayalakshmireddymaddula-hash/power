import React, { useState } from "react";
import { Menu, Bell, LogOut, CheckCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export interface TopNavigationProps {
  onToggleMobileMenu?: () => void;
  unreadCount?: number;
  notifications?: any[];
  onRefreshNotifications?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onToggleMobileMenu,
  unreadCount = 0,
  notifications = [],
  onRefreshNotifications,
}) => {
  const { logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">FlowPilot Engine Active</span>
          <span className="text-slate-600">/</span>
          <span className="text-indigo-400 font-mono text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            DEMO MODE ENABLED
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-slate-950">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-semibold text-slate-200">In-App Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No recent notifications</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg border text-xs ${
                        n.readAt
                          ? "bg-slate-900/40 border-slate-800/60 text-slate-400"
                          : "bg-indigo-950/20 border-indigo-500/30 text-slate-200"
                      }`}
                    >
                      <p className="font-medium text-slate-100">{n.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 mt-2 border-t border-slate-800 text-center">
                <Link
                  to="/app/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
