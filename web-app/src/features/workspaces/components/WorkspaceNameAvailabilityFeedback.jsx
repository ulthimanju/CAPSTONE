import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useWorkspaceNameAvailability } from '../hooks/useWorkspaces';
import { cn } from '@/lib/cn';

/**
 * Real-time workspace name availability feedback component.
 * Displays validation and duplicate-check status right below the input box.
 */
export function WorkspaceNameAvailabilityFeedback({
  name = '',
  excludeWorkspaceId = null,
  initialName = '',
  schemaError = null,
  className,
}) {
  const trimmed = (name || '').trim();
  const [debouncedName, setDebouncedName] = useState(trimmed);

  // Debounce input to avoid spamming the validation endpoint on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(trimmed);
    }, 250);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const isSameAsInitial = Boolean(
    initialName && trimmed.toLowerCase() === initialName.trim().toLowerCase()
  );

  const isCheckingEnabled = Boolean(debouncedName.length >= 1 && !isSameAsInitial && !schemaError);

  const {
    data: availability,
    isLoading,
    isFetching,
  } = useWorkspaceNameAvailability(
    isCheckingEnabled ? debouncedName : '',
    excludeWorkspaceId
  );

  // 1. If there is a schema error (e.g. min/max length, required), show schema error
  if (schemaError) {
    return (
      <div className={cn('flex items-center gap-1.5 font-mono text-[11px] text-danger mt-1.5', className)}>
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{schemaError}</span>
      </div>
    );
  }

  // 2. If name is empty, don't display anything yet
  if (!trimmed) {
    return null;
  }

  // 3. If editing and name is identical to the current saved workspace name
  if (isSameAsInitial) {
    return (
      <div className={cn('flex items-center gap-1.5 font-mono text-[11px] text-text/60 mt-1.5', className)}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-text/50" aria-hidden="true" />
        <span>Current workspace name</span>
      </div>
    );
  }

  // 4. Loading state while checking backend
  if (isLoading || (isFetching && debouncedName === trimmed)) {
    return (
      <div className={cn('flex items-center gap-1.5 font-mono text-[11px] text-text/60 mt-1.5', className)}>
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" aria-hidden="true" />
        <span>Checking name availability...</span>
      </div>
    );
  }

  // 5. Backend availability response
  if (availability) {
    if (availability.available) {
      return (
        <div className={cn('flex items-center gap-1.5 font-mono text-[11px] text-success mt-1.5', className)}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          <span>{availability.reason || 'Workspace name is available.'}</span>
        </div>
      );
    } else {
      return (
        <div className={cn('flex items-center gap-1.5 font-mono text-[11px] text-danger mt-1.5', className)}>
          <XCircle className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
          <span>{availability.reason || 'You already have an active workspace with this name.'}</span>
        </div>
      );
    }
  }

  return null;
}

export default WorkspaceNameAvailabilityFeedback;
