import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import {
  CodeBoldIcon,
  BookLinearIcon,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
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
import { WorkspaceNameAvailabilityFeedback } from './WorkspaceNameAvailabilityFeedback';
import { createWorkspaceRequestSchema } from '../schemas/workspaceSchemas';
import { useCreateWorkspaceMutation } from '../hooks/useWorkspaces';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/cn';

export const PREDEFINED_CODE_LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C',
  'C++',
  'C#',
  'Go',
  'Rust',
  'SQL',
  'PHP',
  'Ruby',
  'Kotlin',
  'Swift',
  'R',
  'Shell / Bash',
  'HTML / CSS',
  'General / Multi-Language',
];

export function CreateWorkspaceModal({ open, onOpenChange, onSuccess }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createWorkspaceRequestSchema),
    defaultValues: {
      name: '',
      domain_type: 'TECHNICAL',
      workspace_code_language: 'Python',
      visibility: 'PRIVATE',
    },
  });

  const watchedName = watch('name');
  const watchedDomainType = watch('domain_type');

  const createMutation = useCreateWorkspaceMutation({
    onSuccess: (data) => {
      reset();
      onOpenChange(false);
      onSuccess?.(data);
    },
  });

  const onSubmit = (formData) => {
    const payload = {
      ...formData,
      visibility: 'PRIVATE',
      workspace_code_language:
        formData.domain_type === 'TECHNICAL' ? formData.workspace_code_language || 'Python' : null,
    };
    createMutation.mutate(payload);
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
          {/* Workspace Name Input with Real-time Availability Validator */}
          <div className="space-y-1.5">
            <label htmlFor="workspace-name-input" className="block text-xs font-mono font-medium text-text">
              Workspace Name <span className="text-danger">*</span>
            </label>
            <Input
              id="workspace-name-input"
              placeholder="e.g. Operating System"
              maxLength={16}
              error={!!errors.name}
              {...register('name')}
              autoFocus
            />
            <WorkspaceNameAvailabilityFeedback
              name={watchedName}
              schemaError={errors.name?.message}
            />
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
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover hover:border-sep-line/80'
                    )}
                  >
                    <CodeBoldIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover hover:border-sep-line/80'
                    )}
                  >
                    <BookLinearIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="text-xs font-bold font-mono">Non-Technical</div>
                      <div className="text-[10px] text-text/60 font-body">Humanities, General</div>
                    </div>
                  </button>
                </div>
              )}
            />
          </div>

          {/* Primary Code Language Selection (Visible ONLY for Technical workspaces) */}
          {watchedDomainType === 'TECHNICAL' && (
            <div className="space-y-1.5 transition-all">
              <label
                htmlFor="workspace-code-language-select"
                className="block text-xs font-mono font-medium text-text"
              >
                Primary Code Language
              </label>
              <Controller
                name="workspace_code_language"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || 'Python'}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="workspace-code-language-select">
                      <SelectValue placeholder="Select primary language" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_CODE_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[10px] text-text/60 font-body">
                Specifies the default code and syntax language for AI summaries, code blocks, and tutoring.
              </p>
            </div>
          )}

          {/* Server Error Message */}
          {createMutation.isError && (
            <div className="flex items-center gap-2 rounded-ui border border-danger/30 bg-danger-tint p-2.5 text-xs text-danger font-mono">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {getErrorMessage(createMutation.error, 'Failed to create workspace. Please try again.')}
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
