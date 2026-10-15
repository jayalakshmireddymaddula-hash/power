export class ApiClientError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || "/api/v1";

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("flowpilot_token");
  const activeOrgId = localStorage.getItem("flowpilot_active_org");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (activeOrgId) {
    headers["X-Organization-ID"] = activeOrgId;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  // Handle CSV and file responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/csv")) {
    const text = await response.text();
    return text as unknown as T;
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errObj = json.error || {};
    throw new ApiClientError(
      response.status,
      errObj.code || "API_ERROR",
      errObj.message || `Request failed with status ${response.status}`,
      errObj.details
    );
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
};

// Domain-specific typed API services
export const reportsApi = {
  getSummary: (period = "30d") => api.get(`/reports/summary?period=${period}`),
  getWorkflows: (period = "30d") => api.get(`/reports/workflows?period=${period}`),
  getApprovals: (period = "30d") => api.get(`/reports/approvals?period=${period}`),
  exportCsv: async (period = "30d") => {
    const csvContent = await apiRequest<string>(`/reports/export.csv?period=${period}`);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `flowpilot-report-${period}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

export const notificationsApi = {
  getAll: () => api.get<any[]>("/notifications"),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post("/notifications/read-all"),
};

export const orgApi = {
  getCurrent: () => api.get("/organizations/current"),
  getMembers: () => api.get<any[]>("/organizations/current/members"),
  inviteMember: (data: { email: string; role: string }) =>
    api.post("/organizations/current/invitations", data),
  getDepartments: () => api.get<any[]>("/organizations/current/departments"),
};

export const policiesApi = {
  getApprovalPolicies: () => api.get<any[]>("/policies/approvals"),
  saveApprovalPolicy: (data: any) => api.post("/policies/approvals", data),
  getEfficiency: () => api.get("/settings/efficiency"),
  updateEfficiency: (data: any) => api.patch("/settings/efficiency", data),
};

export const demoApi = {
  seed: () => api.post<{ message: string; seeded: any }>("/demo/seed"),
  reset: () => api.post<{ message: string }>("/demo/reset"),
};

export const aiApi = {
  classifyRequest: (data: any) => api.post("/ai/classify-request", data),
  structureRequest: (data: any) => api.post("/ai/structure-request", data),
  extractDocument: (data: any) => api.post("/ai/extract-document", data),
  analyzeBottlenecks: (data: any) => api.post("/ai/analyze-bottlenecks", data),
  recommendImprovements: (data: any) => api.post("/ai/recommend-improvements", data),
};

export const requestsApi = {
  getAll: (params?: any) => api.get<any[]>("/requests"),
  getById: (id: string) => api.get(`/requests/${id}`),
  create: (data: any) => api.post("/requests", data),
  submit: (id: string) => api.post(`/requests/${id}/submit`),
  cancel: (id: string) => api.post(`/requests/${id}/cancel`),
  getTimeline: (id: string) => api.get<any[]>(`/requests/${id}/timeline`),
};

export const approvalsApi = {
  getAll: () => api.get<any[]>("/approvals"),
  getById: (id: string) => api.get(`/approvals/${id}`),
  approve: (id: string, comment?: string) => api.post(`/approvals/${id}/approve`, { comment }),
  reject: (id: string, reason: string) => api.post(`/approvals/${id}/reject`, { reason }),
  requestChanges: (id: string, details: string) =>
    api.post(`/approvals/${id}/request-changes`, { details }),
};

export const workflowsApi = {
  getAll: () => api.get<any[]>("/workflows"),
  getTemplates: () => api.get<any[]>("/workflows/templates"),
  getById: (id: string) => api.get(`/workflows/${id}`),
  create: (data: any) => api.post("/workflows", data),
  update: (id: string, data: any) => api.patch(`/workflows/${id}`, data),
  validate: (id: string) => api.post(`/workflows/${id}/validate`),
  publish: (id: string) => api.post(`/workflows/${id}/publish`),
  activate: (id: string) => api.post(`/workflows/${id}/activate`),
  pause: (id: string) => api.post(`/workflows/${id}/pause`),
  archive: (id: string) => api.post(`/workflows/${id}/archive`),
  duplicate: (id: string) => api.post(`/workflows/${id}/duplicate`),
};

export const executionsApi = {
  getAll: () => api.get<any[]>("/executions"),
  getById: (id: string) => api.get(`/executions/${id}`),
  getSteps: (id: string) => api.get<any[]>(`/executions/${id}/steps`),
  retry: (id: string) => api.post(`/executions/${id}/retry`),
  cancel: (id: string) => api.post(`/executions/${id}/cancel`),
};

export const tasksApi = {
  getAll: () => api.get<any[]>("/tasks"),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post("/tasks", data),
  complete: (id: string) => api.post(`/tasks/${id}/complete`),
  reassign: (id: string, assignedTo: string) => api.post(`/tasks/${id}/reassign`, { assignedTo }),
};

export const documentsApi = {
  getAll: () => api.get<any[]>("/documents"),
  getUploadUrl: (data: any) => api.post("/documents/upload-url", data),
  confirmUpload: (id: string) => api.post(`/documents/${id}/confirm-upload`),
  process: (id: string) => api.post(`/documents/${id}/process`),
  getDownloadUrl: (id: string) => api.get(`/documents/${id}/download-url`),
};
