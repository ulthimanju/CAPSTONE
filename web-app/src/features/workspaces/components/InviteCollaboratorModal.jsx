import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  AlertCircle,
  Shield,
  Edit3,
  Eye,
  Check,
  Minus,
  Table,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useQueryClient } from '@tanstack/react-query';
import { inviteMemberRequestSchema } from '../schemas/memberSchemas';
import { useInviteMemberMutation, memberKeys } from '../hooks/useMembers';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';

export function InviteCollaboratorModal({
  workspaceId,
  open,
  onOpenChange,
  onSuccess,
  isOwner = true,
}) {
  const queryClient = useQueryClient();
  const [showMatrix, setShowMatrix] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inviteMemberRequestSchema),
    defaultValues: {
      email: '',
      role: 'EDITOR',
    },
  });

  const inviteMutation = useInviteMemberMutation(workspaceId, {
    onSuccess: (data, variables) => {
      const targetEmail = variables?.email || data?.invited_email || 'collaborator';
      const assignedRole = variables?.role || data?.role || 'EDITOR';

      // 1. Optimistic Cache Update: immediately append new invitation into local query cache
      if (workspaceId && data) {
        queryClient.setQueryData(memberKeys.invitations(workspaceId), (old) => {
          const list = Array.isArray(old) ? [...old] : [];
          const exists = list.some((inv) => inv.id === data.id);
          if (!exists) {
            list.unshift(data);
          }
          return list;
        });
      }

      // 2. Invalidate & force refetch across all listeners
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
      queryClient.refetchQueries({ queryKey: memberKeys.invitations(workspaceId) });

      toast.success(`Invitation successfully sent to ${targetEmail} as ${assignedRole}!`);
      reset();
      onOpenChange(false);
      onSuccess?.(data);
    },
  });

  const onSubmit = (formData) => {
    inviteMutation.mutate(formData);
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      reset();
      inviteMutation.reset();
      setShowMatrix(false);
    }
    onOpenChange(isOpen);
  };

  const matrixPermissions = [
    { name: 'Study summaries, flashcards & quiz', viewer: true, editor: true, admin: true },
    { name: 'Chat with AI Tutor & practice problems', viewer: true, editor: true, admin: true },
    { name: 'Upload documents & add notes', viewer: false, editor: true, admin: true },
    { name: 'Generate AI summaries & curriculums', viewer: false, editor: true, admin: true },
    { name: 'Invite collaborators & resend invites', viewer: false, editor: false, admin: true },
    { name: 'Edit collaborator roles & remove members', viewer: false, editor: false, admin: true },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Invite teammates or classmates with verified registered accounts to study together.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Email input */}
          <div className="space-y-1.5">
            <label htmlFor="invite-email-input" className="block text-xs font-mono font-medium text-text">
              User Email Address <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Input
                id="invite-email-input"
                type="email"
                placeholder="colleague@university.edu"
                error={!!errors.email}
                {...register('email')}
                autoFocus
              />
            </div>
            {errors.email ? (
              <p className="font-mono text-[11px] text-danger">
                {errors.email.message}
              </p>
            ) : (
              <p className="font-body text-[11px] text-text/60">
                Recipient must already have a registered account in the system.
              </p>
            )}
          </div>

          {/* Role selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-medium text-text">
                Assigned Role
              </label>
              <button
                type="button"
                onClick={() => setShowMatrix((prev) => !prev)}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline focus-visible:outline-none"
              >
                <Table className="h-3 w-3" />
                {showMatrix ? 'Hide Role Permissions' : 'Compare Role Permissions'}
                {showMatrix ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => field.onChange('ADMIN')}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-ui border p-2.5 text-left transition-all',
                        field.value === 'ADMIN'
                          ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                          : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover hover:border-sep-line/80'
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                        <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Admin
                      </div>
                      <div className="text-[10px] text-text/60 font-body leading-tight">
                        Manage members & docs
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => field.onChange('EDITOR')}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-ui border p-2.5 text-left transition-all',
                      field.value === 'EDITOR'
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover hover:border-sep-line/80'
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                      <Edit3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Editor
                    </div>
                    <div className="text-[10px] text-text/60 font-body leading-tight">
                      Edit notes & upload
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => field.onChange('VIEWER')}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-ui border p-2.5 text-left transition-all',
                      field.value === 'VIEWER'
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover hover:border-sep-line/80'
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Viewer
                    </div>
                    <div className="text-[10px] text-text/60 font-body leading-tight">
                      Read-only study
                    </div>
                  </button>
                </div>
              )}
            />
          </div>

          {/* Permissions Matrix Table Form */}
          {showMatrix && (
            <div className="rounded-ui border border-sep-line bg-surface-raised/50 p-2.5 text-xs">
              <div className="font-mono text-[11px] font-bold text-text mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-accent" />
                Role Permissions Breakdown
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-sep-line text-text/60">
                      <th className="pb-1.5 font-semibold">Capability</th>
                      <th className="pb-1.5 text-center px-2">Viewer</th>
                      <th className="pb-1.5 text-center px-2">Editor</th>
                      <th className="pb-1.5 text-center px-2">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sep-line/40">
                    {matrixPermissions.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/30">
                        <td className="py-1.5 pr-2 font-body text-[11px] text-text/80">{item.name}</td>
                        <td className="py-1.5 text-center px-2">
                          {item.viewer ? (
                            <Check className="h-3 w-3 text-emerald-600 inline" />
                          ) : (
                            <Minus className="h-3 w-3 text-text/30 inline" />
                          )}
                        </td>
                        <td className="py-1.5 text-center px-2">
                          {item.editor ? (
                            <Check className="h-3 w-3 text-emerald-600 inline" />
                          ) : (
                            <Minus className="h-3 w-3 text-text/30 inline" />
                          )}
                        </td>
                        <td className="py-1.5 text-center px-2">
                          {item.admin ? (
                            <Check className="h-3 w-3 text-emerald-600 inline" />
                          ) : (
                            <Minus className="h-3 w-3 text-text/30 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Server Error Message */}
          {inviteMutation.isError && (
            <div className="flex items-start gap-2.5 rounded-ui border border-danger/30 bg-danger-tint p-3 text-xs text-danger font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <span className="font-bold">Invitation Failed:</span>
                <p className="font-body text-xs text-danger/90">
                  {getErrorMessage(
                    inviteMutation.error,
                    'Unable to send invitation. Please verify the email and try again.'
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={inviteMutation.isPending || isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={inviteMutation.isPending || isSubmitting}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InviteCollaboratorModal;
