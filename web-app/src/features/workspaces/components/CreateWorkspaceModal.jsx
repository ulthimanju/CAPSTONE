import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Terminal, BookOpen, Lock, Globe, Users, AlertCircle } from 'lucide-react';
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
import { createWorkspaceRequestSchema } from '../schemas/workspaceSchemas';
import { useCreateWorkspaceMutation } from '../hooks/useWorkspaces';
import { cn } from '@/lib/cn';

export function CreateWorkspaceModal({ open, onOpenChange, onSuccess }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createWorkspaceRequestSchema),
    defaultValues: {
      name: '',
      domain_type: 'TECHNICAL',
      visibility: 'PRIVATE',
    },
  });

  const createMutation = useCreateWorkspaceMutation({
    onSuccess: (data) => {
      reset();
      onOpenChange(false);
      onSuccess?.(data);
    },
  });

  const onSubmit = (formData) => {
    createMutation.mutate(formData);
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      reset();
      createMutation.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Configure your collaborative study environment for course materials, documents, and AI tutoring.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Workspace Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="workspace-name-input" className="block text-xs font-mono font-medium text-text">
              Workspace Name <span className="text-danger">*</span>
            </label>
            <Input
              id="workspace-name-input"
              placeholder="e.g. Distributed Systems (CS401)"
              error={!!errors.name}
              {...register('name')}
              autoFocus
            />
            {errors.name && (
              <p className="font-mono text-[11px] text-danger">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Domain Type Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-text">
              Domain Type
            </label>
            <Controller
              name="domain_type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => field.onChange('TECHNICAL')}
                    className={cn(
                      'flex items-center gap-2.5 rounded-ui border p-3 text-left transition-all',
                      field.value === 'TECHNICAL'
                        ? 'border-accent bg-sand/80 ring-1 ring-accent text-accent'
                        : 'border-sep-line bg-surface-raised text-text/80 hover:bg-surface-hover hover:border-sep-line/80'
                    )}
                  >
                    <Terminal className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="text-xs font-bold font-mono">Technical</div>
                      <div className="text-[10px] text-text/60 font-body">CS, Code, Math</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => field.onChange('NON_TECHNICAL')}
                    className={cn(
                      'flex items-center gap-2.5 rounded-ui border p-3 text-left transition-all',
                      field.value === 'NON_TECHNICAL'
                        ? 'border-accent bg-sand/80 ring-1 ring-accent text-accent'
                        : 'border-sep-line bg-surface-raised text-text/80 hover:bg-surface-hover hover:border-sep-line/80'
                    )}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="text-xs font-bold font-mono">Non-Technical</div>
                      <div className="text-[10px] text-text/60 font-body">Humanities, General</div>
                    </div>
                  </button>
                </div>
              )}
            />
          </div>

          {/* Visibility Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-text">
              Visibility
            </label>
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange('PRIVATE')}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-ui border p-2 text-center transition-all',
                      field.value === 'PRIVATE'
                        ? 'border-accent bg-sand/80 ring-1 ring-accent text-accent font-semibold'
                        : 'border-sep-line bg-surface-raised text-text/70 hover:bg-surface-hover'
                    )}
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[11px] font-mono">Private</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => field.onChange('INTERNAL')}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-ui border p-2 text-center transition-all',
                      field.value === 'INTERNAL'
                        ? 'border-accent bg-sand/80 ring-1 ring-accent text-accent font-semibold'
                        : 'border-sep-line bg-surface-raised text-text/70 hover:bg-surface-hover'
                    )}
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[11px] font-mono">Internal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => field.onChange('PUBLIC')}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-ui border p-2 text-center transition-all',
                      field.value === 'PUBLIC'
                        ? 'border-accent bg-sand/80 ring-1 ring-accent text-accent font-semibold'
                        : 'border-sep-line bg-surface-raised text-text/70 hover:bg-surface-hover'
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[11px] font-mono">Public</span>
                  </button>
                </div>
              )}
            />
          </div>

          {/* Server Error Message */}
          {createMutation.isError && (
            <div className="flex items-center gap-2 rounded-ui border border-danger/30 bg-danger-tint p-2.5 text-xs text-danger font-mono">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {createMutation.error?.response?.data?.detail ||
                  createMutation.error?.message ||
                  'Failed to create workspace. Please try again.'}
              </span>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending || isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || isSubmitting}
            >
              Create Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkspaceModal;
