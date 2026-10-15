import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNavigation } from "./TopNavigation";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export const AppLayout: React.FC = () => {
  const { activeOrg } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);

  const fetchLiveCounts = async () => {
    if (!activeOrg) return;
    try {
      // Pending approvals count
      const approvals = await api.get<any[]>("/approvals?status=pending");
      setPendingApprovalsCount(approvals?.length || 0);

      // Notifications
      const notifsRes = await api.get<{ data: any[]; meta?: { unreadCount: number } }>("/notifications");
      setUnreadNotifications(notifsRes?.data || []);
    } catch (err) {
      // Silent error during polling
    }
  };

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 10000);
    return () => clearInterval(interval);
  }, [activeOrg?.id]);

  const unreadCount = unreadNotifications.filter((n) => !n.readAt).length;

  return (
    <div className="flex h-screen bg-[#070b13] text-slate-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar pendingApprovalsCount={pendingApprovalsCount} />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64">
            <Sidebar
              pendingApprovalsCount={pendingApprovalsCount}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavigation
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          unreadCount={unreadCount}
          notifications={unreadNotifications}
          onRefreshNotifications={fetchLiveCounts}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-b from-[#090d16] to-[#060911]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
