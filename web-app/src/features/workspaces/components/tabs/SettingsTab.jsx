import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Trash2, Terminal, BookOpen, Lock, Users, Globe, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createWorkspaceRequestSchema } from '../../schemas/workspaceSchemas';
import { useUpdateWorkspaceMutation, useDeleteWorkspaceMutation } from '../../hooks/useWorkspaces';
import { ROUTES } from '@/config/constants';
import { cn } from '@/lib/cn';

export function SettingsTab({ workspace: propWorkspace }) {
  const context = useOutletContext() || {};
  const workspace = propWorkspace || context.workspace;

  const navigate = useNavigate();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createWorkspaceRequestSchema),
    defaultValues: {
      name: workspace?.name || '',
      domain_type: workspace?.domain_type || 'TECHNICAL',
      visibility: workspace?.visibility || 'PRIVATE',
    },
  });

  const updateMutation = useUpdateWorkspaceMutation(workspace?.id, {
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const deleteMutation = useDeleteWorkspaceMutation({
    onSuccess: () => {
      navigate(ROUTES.WORKSPACES, { replace: true });
    },
  });

  if (!workspace) return null;

  const onSubmit = (formData) => {
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete workspace "${workspace.name}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(workspace.id);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Workspace Settings Card */}
      <Card className="p-6">
        <h2 className="font-display text-lg font-bold text-text">
          Workspace Settings
        </h2>
        <p className="font-body text-xs text-text/70 mb-6">
          Update the display name, academic domain type, and collaborator visibility.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="settings-workspace-name" className="block text-xs font-mono font-medium text-text">
              Workspace Name
            </label>
            <Input
              id="settings-workspace-name"
              error={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="font-mono text-[11px] text-danger">{errors.name.message}</p>
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
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover'
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
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/80 hover:bg-surface-hover'
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
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/70 hover:bg-surface-hover'
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
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/70 hover:bg-surface-hover'
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
                        ? 'border-accent bg-sand ring-1 ring-accent text-accent font-semibold shadow-theme'
                        : 'border-sep-line bg-bg text-text/70 hover:bg-surface-hover'
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[11px] font-mono">Public</span>
                  </button>
                </div>
              )}
            />
          </div>

          {/* Action Buttons: Save Changes on Left, Delete Workspace on Right */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-sep-line">
            <Button
              type="submit"
              isLoading={updateMutation.isPending}
              leftIcon={saveSuccess ? <Check className="h-4 w-4 text-success" /> : <Save className="h-4 w-4" />}
            >
              {saveSuccess ? 'Saved Changes' : 'Save Changes'}
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete Workspace
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default SettingsTab;
