import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Envelope, Check, X, Clock, ShieldCheck, ArrowRight, Buildings } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useUserPendingInvitationsQuery,
  useAcceptUserInvitationMutation,
  useRejectUserInvitationMutation,
} from '@/features/workspaces/hooks/useMembers';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { toast } from 'sonner';

export function InvitationsPage() {
  const navigate = useNavigate();
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);
  const { data: invitations = [], isLoading, error } = useUserPendingInvitationsQuery();

  const acceptMutation = useAcceptUserInvitationMutation({
    onSuccess: (data) => {
      toast.success('Invitation accepted! Welcome to the workspace.');
      if (data?.workspace_id) {
        setActiveWorkspaceId(data.workspace_id);
        navigate(`/workspaces/${data.workspace_id}/documents`);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to accept invitation');
    },
  });

  const rejectMutation = useRejectUserInvitationMutation({
    onSuccess: () => {
      toast.success('Invitation declined');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to decline invitation');
    },
  });

  const handleAccept = (invitationId) => {
    acceptMutation.mutate(invitationId);
  };

  const handleReject = (invitationId) => {
    rejectMutation.mutate(invitationId);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sep-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-text">Invitations</h1>
            {invitations.length > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-bold text-on-accent">
                {invitations.length} pending
              </span>
            )}
          </div>
          <p className="mt-1 font-body text-xs text-text/70">
            Workspace collaboration invitations waiting for your acceptance.
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 text-center text-xs font-mono text-text/60">
          Loading invitations...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && invitations.length === 0 && (
        <Card className="flex flex-col items-center justify-center border-dashed border-sep-line py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
            <Envelope className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-text">
            No pending invitations
          </h3>
          <p className="mt-1 max-w-sm font-body text-xs text-text/70 leading-relaxed">
            When teammates invite you to collaborate on their study workspaces, invitations will appear here.
          </p>
        </Card>
      )}

      {/* Invitations List */}
      {!isLoading && invitations.length > 0 && (
        <div className="space-y-4">
          {invitations.map((inv) => {
            const isProcessing =
              (acceptMutation.isPending && acceptMutation.variables === inv.id) ||
              (rejectMutation.isPending && rejectMutation.variables === inv.id);

            return (
              <Card
                key={inv.id}
                className="p-5 border border-sep-line bg-surface hover:border-accent/40 shadow-xs transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-sep-line bg-sand text-accent">
                      <Buildings className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-sm font-bold text-text">
                          {inv.workspace_name || 'Collaborative Workspace'}
                        </h3>
                      </div>

                      <p className="font-body text-xs text-text/70 leading-relaxed">
                        You were invited{inv.invited_by_name ? (
                          <> by <strong className="text-text font-semibold">{inv.invited_by_name}</strong>{inv.invited_by_email && inv.invited_by_email !== inv.invited_by_name ? <span className="text-text/50"> ({inv.invited_by_email})</span> : null}</>
                        ) : null} to join this workspace as a <strong className="text-text font-semibold">{inv.role}</strong>.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] text-text/50">
                        {inv.created_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Received {new Date(inv.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        {inv.expires_at && (
                          <div className="flex items-center gap-1 text-text/60">
                            <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(inv.id)}
                      disabled={isProcessing}
                      leftIcon={<X className="h-3.5 w-3.5" />}
                      className="text-xs text-danger hover:text-danger hover:bg-danger/10 border-sep-line h-8 px-3"
                    >
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleAccept(inv.id)}
                      isLoading={isProcessing}
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                      className="text-xs h-8 px-3.5"
                    >
                      Accept & Join
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InvitationsPage;
