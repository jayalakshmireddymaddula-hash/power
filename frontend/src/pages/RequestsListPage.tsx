import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, FilePlus2, ChevronLeft, ChevronRight, RefreshCw, Eye } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export const RequestsListPage: React.FC = () => {
  const { activeOrg } = useAuth();

  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (status) params.append("status", status);

      const res = await api.get<{ data: any[]; meta: any }>(`/requests?${params.toString()}`);
      setRequests(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, category, status, activeOrg?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "approved":
      case "completed":
        return <Badge variant="success">{st}</Badge>;
      case "awaiting_approval":
        return <Badge variant="warning">{st.replace("_", " ")}</Badge>;
      case "changes_requested":
        return <Badge variant="warning">changes requested</Badge>;
      case "rejected":
        return <Badge variant="danger">{st}</Badge>;
      default:
        return <Badge variant="neutral">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Requests Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, and monitor status transitions for operational and purchase requests.
          </p>
        </div>
        <Link to="/app/requests/new">
          <Button variant="primary" size="sm" leftIcon={<FilePlus2 className="w-4 h-4" />}>
            New Request
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Categories</option>
            <option value="procurement">Procurement</option>
            <option value="hr">HR & Onboarding</option>
            <option value="operations">Operations</option>
            <option value="document_processing">Document Processing</option>
            <option value="it_support">IT Support</option>
            <option value="finance">Finance</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <Button type="submit" variant="secondary" size="sm">
            Apply Filters
          </Button>

          <button
            type="button"
            onClick={fetchRequests}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </form>
      </Card>

      {/* Requests Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Req #</th>
                <th className="py-3 px-4 font-semibold">Title</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Requester</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                    No requests found matching current criteria.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-slate-400">#{r.requestNumber}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-100 max-w-xs truncate">
                      <Link to={`/app/requests/${r.id}`} className="hover:text-indigo-400 hover:underline">
                        {r.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 capitalize font-sans">{r.category}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{r.requesterName || "User"}</td>
                    <td className="py-3 px-4 font-sans text-slate-400">{r.departmentName || "—"}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {r.amountMinor ? `₹${(r.amountMinor / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`text-[10px] uppercase font-semibold ${
                          r.priority === "urgent"
                            ? "text-rose-400"
                            : r.priority === "high"
                            ? "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-4 text-slate-500 font-sans text-[10px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <Link to={`/app/requests/${r.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
