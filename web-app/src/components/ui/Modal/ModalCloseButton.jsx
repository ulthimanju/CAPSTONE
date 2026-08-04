import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function ModalCloseButton({
  icon = "close",
  "aria-label": ariaLabel = "Close dialog",
  className,
  ...props
}) {
  return (
    <Dialog.Close
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center",
        "rounded-[var(--radius-xs)]",
        "p-1.5",
        "text-[var(--color-text-muted)]",
        "transition-colors",
        "hover:bg-[var(--color-bg-secondary)]",
        "hover:text-[var(--color-text-primary)]",
        "focus:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--color-primary)]",
        className
      )}
      {...props}
    >
      <Icon name={icon} size="sm" />
    </Dialog.Close>
  );
}
