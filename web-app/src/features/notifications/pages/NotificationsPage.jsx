import React, { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Bell, CheckCheck, Clock, Mail, FileText, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function NotificationsPage() {
  const { workspaceId } = useParams();
  const context = useOutletContext() || {};
  const workspace = context.workspace;

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Workspace Initialized',
      message: workspace?.name
        ? `Workspace "${workspace.name}" is ready for collaboration and document processing.`
        : 'Welcome to SYNAPSE! Start by uploading your study materials.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'SYSTEM',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'AI Tutor Ready',
      message: 'Vector indexing is enabled for contextual questions and answers.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      type: 'TUTOR',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleToggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'UNREAD' ? !n.read : true
  );

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
            Activity updates, document processing alerts, and collaborator invitations.
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
              onClick={handleMarkAllRead}
              leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
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
              : 'You have no notifications in this workspace yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <Card
              key={item.id}
              onClick={() => handleToggleRead(item.id)}
              className={`cursor-pointer transition-colors p-4 flex items-start justify-between gap-4 border ${
                item.read
                  ? 'bg-surface/60 border-sep-line/60 opacity-80'
                  : 'bg-surface border-sep-line hover:border-accent shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border ${
                    item.read
                      ? 'bg-sand/40 border-sep-line/40 text-text/50'
                      : 'bg-sand border-sep-line text-accent'
                  }`}
                >
                  {item.type === 'TUTOR' ? (
                    <Sparkles className="h-4 w-4" />
                  ) : item.type === 'INVITE' ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs font-semibold ${
                        item.read ? 'text-text/80' : 'text-text font-bold'
                      }`}
                    >
                      {item.title}
                    </h4>
                    {!item.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-1 font-body text-xs text-text/70 leading-relaxed">
                    {item.message}
                  </p>
                  <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-text/50">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <span className="font-mono text-[10px] text-text/40 shrink-0">
                {item.read ? 'Read' : 'Click to mark read'}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
