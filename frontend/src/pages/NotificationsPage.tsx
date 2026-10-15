import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Bell, CheckCircle2, AlertCircle, Clock, FileText, 
  Check, ArrowRight, Trash2, Filter, Sparkles 
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { notificationsApi } from '../lib/api';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    refetchInterval: 5000, // Reactive polling
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading notification stream..." />;
  }

  const filteredNotifications = notifications.filter((n: any) => {
    if (filter === 'unread') return !n.read_at;
    return true;
  });

  const unreadCount = notifications.filter((n: any) => !n.read_at).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_required':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'approval_completed':
      case 'workflow_completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'request_rejected':
      case 'workflow_failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'task_assigned':
        return <FileText className="w-5 h-5 text-indigo-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  const getResourceLink = (n: any) => {
    if (!n.resource_type || !n.resource_id) return null;
    switch (n.resource_type) {
      case 'request':
        return `/app/requests/${n.resource_id}`;
      case 'approval':
        return `/app/approvals/${n.resource_id}`;
      case 'task':
        return `/app/tasks`;
      case 'execution':
        return `/app/executions`;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-indigo-400" />
            Notifications & Dispatch Log
            {unreadCount > 0 && (
              <Badge variant="primary" className="ml-2 font-mono text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time audit signals, approval assignments, and workflow execution alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filter === 'unread' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              loading={markAllReadMutation.isPending}
              className="text-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card className="bg-gray-900/60 border-gray-800 backdrop-blur-sm divide-y divide-gray-800/80">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description="All clear! You'll be notified here when approval tasks are assigned, requests are updated, or workflows transition."
          />
        ) : (
          filteredNotifications.map((n: any) => {
            const link = getResourceLink(n);
            const isUnread = !n.read_at;

            return (
              <div 
                key={n.id} 
                className={`p-5 flex items-start justify-between gap-4 transition hover:bg-gray-800/30 ${
                  isUnread ? 'bg-indigo-950/15' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUnread ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-gray-800/80 border-gray-700'
                  }`}>
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-semibold ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {n.title}
                      </h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-500">
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      {n.resource_type && (
                        <span className="capitalize px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                          {n.resource_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {link && (
                    <Link to={link}>
                      <Button variant="ghost" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        View
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(n.id)}
                      className="text-xs text-gray-400 hover:text-white"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
};
