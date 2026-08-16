import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  Mail,
  FileText,
  Sparkles,
  Archive,
  RotateCcw,
  Edit3,
  UserPlus,
  UserMinus,
  Trash2,
  Folder,
  Compass,
} from 'lucide-react';
import {
  useNotificationsQuery,
  useNotificationSSE,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../hooks/useNotifications';
import { Card, Button, BookLinearIcon } from '@/components/ui';
import { toast } from 'sonner';

export function NotificationsPage() {
  // Real-time live SSE notification stream listener
  useNotificationSSE();

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  const { data, isLoading, error } = useNotificationsQuery({ limit: 100 });
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation({
    onSuccess: () => {
      toast.success('All notifications marked as read');
    },
  });

  const rawNotifications = data?.notifications || [];
  const unreadCount = data?.unread_count ?? rawNotifications.filter((n) => n.status === 'UNREAD').length;

  const filteredNotifications = rawNotifications.filter((n) =>
    filter === 'UNREAD' ? n.status === 'UNREAD' : true
  );

  const getNotificationIcon = (item) => {
    const evt = (item.event_type || item.title || '').toLowerCase();
    if (evt.includes('archive')) return <Archive className="h-4 w-4" />;
    if (evt.includes('restore') || evt.includes('unarchive')) return <RotateCcw className="h-4 w-4" />;
    if (evt.includes('rename') || evt.includes('update')) return <Edit3 className="h-4 w-4" />;
    if (evt.includes('invite') || evt.includes('join')) return <UserPlus className="h-4 w-4" />;
    if (evt.includes('remove') || evt.includes('leave')) return <UserMinus className="h-4 w-4" />;
    if (evt.includes('delete')) return <Trash2 className="h-4 w-4" />;
    if (evt.includes('learning_path') || evt.includes('learning path')) return <Compass className="h-4 w-4" />;
    if (evt.includes('unit')) return <BookLinearIcon className="h-4 w-4" />;
    if (evt.includes('summary') || evt.includes('document')) return <FileText className="h-4 w-4" />;
    if (item.type === 'TUTOR') return <Sparkles className="h-4 w-4" />;
    if (item.type === 'INVITE') return <Mail className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const handleToggleRead = (item) => {
    if (item.status === 'UNREAD') {
      markReadMutation.mutate(item.id);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sep-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-text">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-bold text-on-accent">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="mt-1 font-body text-xs text-text/70">
            Workspace events, member updates, and real-time activity stored in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-ui border border-sep-line bg-surface p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                filter === 'ALL'
                  ? 'bg-sand font-bold text-accent shadow-xs'
                  : 'text-text/70 hover:text-text'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                filter === 'UNREAD'
                  ? 'bg-sand font-bold text-accent shadow-xs'
                  : 'text-text/70 hover:text-text'
              }`}
            >
              Unread
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              isLoading={markAllReadMutation.isPending}
              leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 text-center text-xs font-mono text-text/60">
          Loading notifications...
        </div>
      )}

      {/* Notifications List */}
      {!isLoading && filteredNotifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
            <Bell className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-text">
            No notifications
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
            {filter === 'UNREAD'
              ? 'You have caught up with all unread notifications.'
              : 'You have no notifications yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const isRead = item.status === 'READ';
            return (
              <Card
                key={item.id}
                onClick={() => handleToggleRead(item)}
                className={`cursor-pointer transition-colors p-4 flex items-start justify-between gap-4 border ${
                  isRead
                    ? 'bg-surface/60 border-sep-line/60 opacity-80'
                    : 'bg-surface border-sep-line hover:border-accent shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border ${
                      isRead
                        ? 'bg-sand/40 border-sep-line/40 text-text/50'
                        : 'bg-sand border-sep-line text-accent'
                    }`}
                  >
                    {getNotificationIcon(item)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-xs ${
                          isRead ? 'text-text/80 font-medium' : 'text-text font-bold'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {!isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                      {item.workspace_name && (
                        <span className="rounded bg-sand px-1.5 py-0.5 font-mono text-[9px] text-accent border border-sep-line/50">
                          {item.workspace_name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-body text-xs text-text/70 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Metadata details if renamed */}
                    {item.metadata?.old_name && item.metadata?.new_name && (
                      <p className="mt-1 font-mono text-[10px] text-text/60">
                        Renamed from <span className="line-through">{item.metadata.old_name}</span> to <span className="font-semibold text-text">{item.metadata.new_name}</span>
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-text/50">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(item.created_at || Date.now()).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <span className="font-mono text-[10px] text-text/40 shrink-0">
                  {isRead ? 'Read' : 'Click to mark read'}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
