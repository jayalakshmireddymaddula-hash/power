import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";

export interface User {
  id: string;
  email: string;
  fullName: string;
  name?: string;
  role?: string;
  avatarUrl?: string | null;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  activeOrg: OrganizationInfo | null;
  organization: OrganizationInfo | null; // Alias for activeOrg
  organizations: OrganizationInfo[];
  role: string;
  isLoading: boolean;
  login: (token: string, user: User, orgs: OrganizationInfo[], activeOrg: OrganizationInfo | null) => void;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrganizationInfo | null>(null);
  const [role, setRole] = useState<string>("member");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    const token = localStorage.getItem("flowpilot_token");
    if (!token) {
      setUser(null);
      setActiveOrg(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get<{
        user: any;
        organizations: OrganizationInfo[];
        activeOrganization: OrganizationInfo | null;
        role: string;
      }>("/auth/me");

      const normalizedUser: User = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName || data.user.name || "FlowPilot User",
        name: data.user.fullName || data.user.name || "FlowPilot User",
        role: data.role || data.user.role || "member",
        avatarUrl: data.user.avatarUrl,
      };

      setUser(normalizedUser);
      setOrganizations(data.organizations || []);

      const savedOrgId = localStorage.getItem("flowpilot_active_org");
      const matched = (data.organizations || []).find((o) => o.id === savedOrgId) || data.activeOrganization;

      if (matched) {
        setActiveOrg(matched);
        setRole(matched.role);
        localStorage.setItem("flowpilot_active_org", matched.id);
      } else {
        setActiveOrg(null);
      }
    } catch {
      localStorage.removeItem("flowpilot_token");
      setUser(null);
      setActiveOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = (
    token: string,
    userData: any,
    orgs: OrganizationInfo[],
    activeOrganization: OrganizationInfo | null
  ) => {
    localStorage.setItem("flowpilot_token", token);
    const normalizedUser: User = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName || userData.name || "FlowPilot User",
      name: userData.fullName || userData.name || "FlowPilot User",
      role: userData.role || activeOrganization?.role || "member",
      avatarUrl: userData.avatarUrl,
    };
    setUser(normalizedUser);
    setOrganizations(orgs);

    if (activeOrganization) {
      setActiveOrg(activeOrganization);
      setRole(activeOrganization.role);
      localStorage.setItem("flowpilot_active_org", activeOrganization.id);
    }
  };

  const logout = () => {
    localStorage.removeItem("flowpilot_token");
    localStorage.removeItem("flowpilot_active_org");
    setUser(null);
    setActiveOrg(null);
    setOrganizations([]);
    window.location.href = "/login";
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setActiveOrg(org);
      setRole(org.role);
      localStorage.setItem("flowpilot_active_org", org.id);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrg,
        organization: activeOrg,
        organizations,
        role,
        isLoading,
        login,
        logout,
        switchOrganization,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
