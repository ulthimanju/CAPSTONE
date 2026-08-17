import React, { useState, useMemo } from 'react';
import {
  Clock,
  MagnifyingGlass,
  RefreshCw,
  Shield,
  Crown,
  UserPlus,
  CheckCircle,
  UserMinus,
  ArrowRightLeft,
  FileText,
  Trophy,
  WarningCircle,
  CaretLeft,
  CaretRight,
} from '@/components/ui/icons';
import {
  Card,
  Button,
  Avatar,
  Input,
  LogsIcon,
} from '@/components/ui';
import { useWorkspaceActivitiesQuery } from '../../hooks/useMembers';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

export function ActivityTab({ workspaceId, members = [] }) {
  const currentUser = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const {
    data: activities = [],
    isLoading,
    isFetching,
    refetch,
  } = useWorkspaceActivitiesQuery(workspaceId, { page, limit: 10 });

  // Map of actor_id to member profile
  const memberMap = useMemo(() => {
    const map = new Map();
    members.forEach((m) => {
      map.set(m.user_id, m);
    });
    return map;
  }, [members]);

  // Filtered activities on current page
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'MEMBERS' && !act.activity_type.startsWith('MEMBER_') && act.activity_type !== 'ROLE_CHANGED') {
          return false;
        }
        if (typeFilter === 'OWNERSHIP' && act.activity_type !== 'OWNERSHIP_TRANSFERRED') {
          return false;
        }
        if (typeFilter === 'QUIZ' && act.activity_type !== 'QUIZ_COMPLETED' && act.entity_type !== 'quiz_submission') {
          return false;
        }
        if (typeFilter === 'WORKSPACE' && !act.activity_type.startsWith('WORKSPACE_')) {
          return false;
        }
      }

      // MagnifyingGlass query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const member = memberMap.get(act.actor_id);
      const actorName = member?.user_name || '';
      const actorEmail = member?.user_email || '';

      return (
        act.actor_id.toLowerCase().includes(q) ||
        act.activity_type.toLowerCase().includes(q) ||
        act.entity_type.toLowerCase().includes(q) ||
        actorName.toLowerCase().includes(q) ||
        actorEmail.toLowerCase().includes(q)
      );
    });
  }, [activities, searchQuery, typeFilter, memberMap]);

  // Activity type style helper
  const getActivityBadge = (type, entityType) => {
    switch (type) {
      case 'WORKSPACE_CREATED':
      case 'WORKSPACE_RESTORED':
        return {
          label: type.replace(/_/g, ' '),
          icon: Shield,
          className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        };
      case 'WORKSPACE_ARCHIVED':
      case 'WORKSPACE_DELETED':
        return {
          label: type.replace(/_/g, ' '),
          icon: WarningCircle,
          className: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        };
      case 'MEMBER_INVITED':
        return {
          label: 'MEMBER INVITED',
          icon: UserPlus,
          className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        };
      case 'MEMBER_JOINED':
        return {
          label: 'MEMBER JOINED',
          icon: CheckCircle,
          className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        };
      case 'ROLE_CHANGED':
      case 'MEMBER_UPDATED':
        return {
          label: type === 'MEMBER_UPDATED' && entityType === 'quiz_submission' ? 'QUIZ SUBMITTED' : 'ROLE CHANGED',
          icon: ArrowRightLeft,
          className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        };
      case 'MEMBER_REMOVED':
      case 'MEMBER_LEFT':
        return {
          label: type.replace(/_/g, ' '),
          icon: UserMinus,
          className: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        };
      case 'OWNERSHIP_TRANSFERRED':
        return {
          label: 'OWNERSHIP TRANSFERRED',
          icon: Crown,
          className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 font-bold',
        };
      case 'QUIZ_COMPLETED':
        return {
          label: 'QUIZ COMPLETED',
          icon: Trophy,
          className: 'bg-accent/15 text-accent border-accent/30 font-bold',
        };
      case 'DOCUMENT_UPLOADED':
        return {
          label: 'DOCUMENT UPLOADED',
          icon: FileText,
          className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
        };
      default:
        return {
          label: (type || 'ACTIVITY').replace(/_/g, ' '),
          icon: Clock,
          className: 'bg-surface-raised text-text/80 border-sep-line',
        };
    }
  };

  // Format date helper
  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const formatRelativeTime = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      const diffMs = Date.now() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Action & Filter Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* MagnifyingGlass Box */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text/40" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="MagnifyingGlass by user or event..."
            className="pl-8 text-xs h-8 font-mono w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter Buttons */}
          <div className="flex items-center rounded-ui border border-sep-line p-0.5 bg-surface-raised text-[11px] font-mono">
            {['ALL', 'QUIZ', 'MEMBERS', 'OWNERSHIP', 'WORKSPACE'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTypeFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded transition-all font-medium',
                  typeFilter === f
                    ? 'bg-bg text-accent font-bold shadow-xs'
                    : 'text-text/60 hover:text-text'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-accent')} />}
            className="h-8 text-xs font-mono shrink-0"
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Main Clean Table */}
      <Card className="p-0 overflow-hidden shadow-xs border-sep-line">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-sep-line bg-surface-raised/80 text-[11px] font-bold text-text/70 uppercase tracking-wider">
                <th className="py-3 px-5 min-w-[220px]">Actor (User)</th>
                <th className="py-3 px-5 min-w-[180px]">Activity Type</th>
                <th className="py-3 px-5 w-[160px]">Entity Type</th>
                <th className="py-3 px-5 min-w-[160px] text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sep-line bg-bg">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-text/60">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-accent" />
                      <span className="text-xs font-mono">Loading activity log...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-text/60">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <LogsIcon className="h-6 w-6 text-text/30" />
                      <p className="font-mono text-xs text-text/80 font-bold">No activity records found</p>
                      <p className="font-body text-[11px] text-text/50">
                        {searchQuery || typeFilter !== 'ALL'
                          ? 'Try adjusting your MagnifyingGlass query or type filters.'
                          : 'Actions taken by collaborators will appear here automatically.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act, index) => {
                  const actor = memberMap.get(act.actor_id);
                  const isCurrent = currentUser?.id === act.actor_id;
                  const badgeInfo = getActivityBadge(act.activity_type, act.entity_type);
                  const BadgeIcon = badgeInfo.icon;
                  const rowKey = `${act.actor_id}-${act.created_at}-${index}`;

                  return (
                    <tr key={rowKey} className="hover:bg-surface-hover/40 transition-colors">
                      {/* 1. actor_id & resolved profile */}
                      <td className="py-3.5 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={actor?.user_name || 'Collaborator'}
                            size="sm"
                            className="h-8 w-8 text-[11px] shrink-0 font-bold"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-text truncate max-w-[180px]" title={actor?.user_name}>
                                {actor?.user_name || 'Collaborator'}
                              </span>
                              {isCurrent && (
                                <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-accent/10 text-accent">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="font-body text-[11px] text-text/60 truncate max-w-[200px]" title={actor?.user_email || act.actor_id}>
                              {actor?.user_email || `${act.actor_id.slice(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. activity_type */}
                      <td className="py-3.5 px-5 align-middle">
                        <div className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono tracking-wide',
                          badgeInfo.className
                        )}>
                          <BadgeIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{badgeInfo.label}</span>
                        </div>
                      </td>

                      {/* 3. entity_type */}
                      <td className="py-3.5 px-5 align-middle">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-raised border border-sep-line/60 text-text/80">
                          {act.entity_type}
                        </span>
                      </td>

                      {/* 4. created_at */}
                      <td className="py-3.5 px-5 text-right align-middle font-mono text-[11px] text-text/70">
                        <div title={formatDate(act.created_at)}>
                          <div className="font-bold text-text/90">{formatRelativeTime(act.created_at)}</div>
                          <div className="text-[10px] text-text/50">{formatDate(act.created_at).split(',')[0]}</div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-sep-line bg-surface-raised/50 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              leftIcon={<CaretLeft className="h-3.5 w-3.5" />}
              className="h-7 text-xs font-mono px-2.5"
            >
              Previous
            </Button>

            <span className="px-2 py-0.5 rounded bg-surface border border-sep-line text-[11px] font-bold text-accent">
              {page}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={activities.length < 10 || isLoading}
              rightIcon={<CaretRight className="h-3.5 w-3.5" />}
              className="h-7 text-xs font-mono px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ActivityTab;
