import React from 'react';
import { Warning, Info } from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
}) {
  const isDanger = variant === 'danger';

  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border ${
              isDanger
                ? 'border-danger/30 bg-danger-tint text-danger'
                : 'border-sep-line bg-sand text-accent'
            }`}
          >
            {isDanger ? (
              <Warning className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Info className="h-5 w-5" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDanger ? 'danger' : 'primary'}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
