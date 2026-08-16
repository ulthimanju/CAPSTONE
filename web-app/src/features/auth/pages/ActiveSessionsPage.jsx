import React, { useState, useMemo } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Shield,
  ShieldAlert,
  LogOut,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,
} from '../hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

/**
 * Parses JWT payload safely to retrieve the current session_id.
 */
function parseJwtSessionId(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.session_id || parsed.sid || null;
  } catch {
    return null;
  }
}

function parseDeviceInfo(session) {
  const ua = (session.user_agent || session.device || '').toLowerCase();
  const rawDevice = session.device || '';

  let icon = Laptop;
  let type = 'Desktop / Laptop';
  let os = 'Windows';
  let browser = 'Chrome';

  // Detect OS
  if (ua.includes('windows') || rawDevice.toLowerCase().includes('windows')) {
    os = 'Windows';
    type = 'Windows PC';
    icon = Laptop;
  } else if (ua.includes('macintosh') || ua.includes('mac os') || rawDevice.toLowerCase().includes('mac')) {
    os = 'macOS';
    type = 'Mac';
    icon = Laptop;
  } else if (ua.includes('android')) {
    os = 'Android';
    type = 'Android Device';
    icon = Smartphone;
  } else if (ua.includes('iphone')) {
    os = 'iOS';
    type = 'iPhone';
    icon = Smartphone;
  } else if (ua.includes('ipad')) {
    os = 'iPadOS';
    type = 'iPad';
    icon = Tablet;
  } else if (ua.includes('linux')) {
    os = 'Linux';
    type = 'Linux PC';
    icon = Laptop;
  }

  // Detect Browser
  if (ua.includes('edg/')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
  }

  // Only use rawDevice if it's already a clean human-readable name, otherwise format nicely
  const isRawUserAgent = rawDevice.startsWith('Mozilla/') || rawDevice.length > 40;
  const displayName = !isRawUserAgent && rawDevice.trim() ? rawDevice : `${browser} on ${os}`;

  return {
    icon,
    type,
    os,
    browser,
    displayName,
  };
}

/**
 * Formats relative timestamp.
 */
function formatTimeAgo(dateString) {
  if (!dateString) return 'Active recently';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Active recently';
  }
}

export function ActiveSessionsPage() {
  const token = useAuthStore((state) => state.token);
  const currentSessionId = useMemo(() => parseJwtSessionId(token), [token]);

  const { data: sessions = [], isLoading, isError, refetch, isFetching } = useSessionsQuery();
  const revokeMutation = useRevokeSessionMutation();
  const revokeAllMutation = useRevokeAllSessionsMutation();

  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  const [isRevokeAllOpen, setIsRevokeAllOpen] = useState(false);

  // Partition current vs other sessions
  const { currentSession, otherSessions } = useMemo(() => {
    let current = null;
    const others = [];

    sessions.forEach((s) => {
      if (currentSessionId && s.id === currentSessionId) {
        current = s;
      } else {
        others.push(s);
      }
    });

    // If current couldn't be strictly matched by ID, treat first as current
    if (!current && sessions.length > 0) {
      current = sessions[0];
      others.shift();
    }

    // Display other active devices in reverse order
    others.reverse();

    return { currentSession: current, otherSessions: others };
  }, [sessions, currentSessionId]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-sep-line pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-text/60 mb-1">
            <span>Security & Access</span>
            <span>/</span>
            <span className="text-text">Active Sessions</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-text">
            Active Sessions & Devices
          </h1>
          <p className="font-body text-xs text-text/70 mt-1 max-w-xl">
            Review and manage all browsers, mobile devices, and computers currently signed into your academic account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />}
            className="text-xs"
          >
            Refresh
          </Button>

          {otherSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRevokeAllOpen(true)}
              disabled={revokeAllMutation.isPending}
              leftIcon={<LogOut className="h-3.5 w-3.5 text-danger" />}
              className="text-xs text-danger hover:bg-danger-tint hover:border-danger/40"
            >
              Sign Out Other Sessions
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="font-mono text-xs text-text/60">Loading active sessions...</p>
        </div>
      )}

      {isError && (
        <div className="rounded-ui border border-danger/30 bg-danger-tint p-6 text-center space-y-3">
          <AlertTriangle className="h-6 w-6 text-danger mx-auto" />
          <p className="font-display text-sm font-semibold text-danger">
            Unable to load active sessions
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* Current Device Section */}
          {currentSession && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-text">
                  Current Session
                </h2>
                <Badge variant="success" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Active Now
                </Badge>
              </div>

              {(() => {
                const info = parseDeviceInfo(currentSession);
                const IconComponent = info.icon;
                return (
                  <Card className="border-accent/40 bg-surface-raised/80 p-5 shadow-xs transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui bg-accent/10 text-accent border border-accent/20">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-bold text-text">
                              {info.displayName}
                            </span>
                            <span className="font-mono text-[10px] text-accent font-semibold">
                              (This Device)
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-text/60">
                            {currentSession.ip_address && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3 text-text/40" />
                                IP: {currentSession.ip_address}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-text/40" />
                              Last active: {formatTimeAgo(currentSession.last_activity)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="rounded-ui bg-sand px-2.5 py-1 font-mono text-[11px] text-text/70 border border-sep-line">
                          {info.browser} • {info.os}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}

          {/* Other Devices Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-text">
                Other Active Devices ({otherSessions.length})
              </h2>
            </div>

            {otherSessions.length === 0 ? (
              <Card className="border-dashed border-sep-line bg-surface/50 p-8 text-center">
                <Shield className="h-8 w-8 text-accent/50 mx-auto mb-2" />
                <p className="font-display text-xs font-semibold text-text">
                  No other active sessions detected
                </p>
                <p className="font-mono text-[11px] text-text/60 mt-1">
                  You are currently only signed in on this device.
                </p>
              </Card>
            ) : (
              <Card className="divide-y divide-sep-line p-0 overflow-hidden shadow-xs">
                {otherSessions.map((session) => {
                  const info = parseDeviceInfo(session);
                  const IconComponent = info.icon;
                  return (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-4 hover:bg-surface-hover/50 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-surface text-text/70 border border-sep-line">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-display text-xs font-bold text-text">
                            {info.displayName}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-text/60">
                            {session.ip_address && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3 text-text/40" />
                                {session.ip_address}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-text/40" />
                              Last active: {formatTimeAgo(session.last_activity)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionToRevoke(session)}
                          disabled={revokeMutation.isPending}
                          className="text-xs text-danger hover:bg-danger-tint hover:border-danger/40 py-1 px-2.5 font-mono"
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Confirm Single Session Revocation Dialog */}
      <ConfirmDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
        title="Revoke Active Session?"
        description={`Are you sure you want to sign out this device (${sessionToRevoke ? parseDeviceInfo(sessionToRevoke).displayName : 'device'})? Any ongoing tasks or tokens on that device will be terminated immediately.`}
        confirmText="Revoke Session"
        confirmVariant="danger"
        isLoading={revokeMutation.isPending}
        onConfirm={async () => {
          if (sessionToRevoke) {
            await revokeMutation.mutateAsync(sessionToRevoke.id);
            setSessionToRevoke(null);
          }
        }}
      />

      {/* Confirm Revoke All Sessions Dialog */}
      <ConfirmDialog
        open={isRevokeAllOpen}
        onOpenChange={setIsRevokeAllOpen}
        title="Sign Out All Other Sessions?"
        description="Are you sure you want to terminate all active sessions across other devices? You will remain signed in only on this current device."
        confirmText="Sign Out Other Devices"
        confirmVariant="danger"
        isLoading={revokeAllMutation.isPending}
        onConfirm={async () => {
          await revokeAllMutation.mutateAsync();
          setIsRevokeAllOpen(false);
        }}
      />
    </div>
  );
}

export default ActiveSessionsPage;
