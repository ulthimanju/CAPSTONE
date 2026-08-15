import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, AlertCircle, Shield, Edit3, Eye } from 'lucide-react';
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
import { inviteMemberRequestSchema } from '../schemas/memberSchemas';
import { useInviteMemberMutation } from '../hooks/useMembers';
import { cn } from '@/lib/cn';

export function InviteCollaboratorModal({ workspaceId, open, onOpenChange, onSuccess }) {
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
    onSuccess: (data) => {
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
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Invite teammates or classmates by email to collaborate on this workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Email input */}
          <div className="space-y-1.5">
            <label htmlFor="invite-email-input" className="block text-xs font-mono font-medium text-text">
              Email Address <span className="text-danger">*</span>
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
            {errors.email && (
              <p className="font-mono text-[11px] text-danger">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Role selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-text">
              Role & Permissions
            </label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

          {/* Server Error Message */}
          {inviteMutation.isError && (
            <div className="flex items-center gap-2 rounded-ui border border-danger/30 bg-danger-tint p-2.5 text-xs text-danger font-mono">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {inviteMutation.error?.response?.data?.detail ||
                  inviteMutation.error?.message ||
                  'Failed to send invitation. Please try again.'}
              </span>
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
