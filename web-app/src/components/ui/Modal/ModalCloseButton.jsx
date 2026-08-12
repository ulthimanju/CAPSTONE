import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

export function ModalCloseButton({
  "aria-label": ariaLabel = "Close dialog",
  className,
  ...props
}) {
  return (
    <Dialog.Close
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] focus:outline-none",
        className
      )}
      {...props}
    >
      <i className="ti ti-x text-lg"></i>
    </Dialog.Close>
  );
}
