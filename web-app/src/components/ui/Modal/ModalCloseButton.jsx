import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/Icon";
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
        "inline-flex items-center justify-center rounded-md p-1.5 text-[#71717a] transition-colors hover:bg-[#1f1f22] hover:text-[#e4e4e7] focus:outline-none",
        className
      )}
      {...props}
    >
      <i className="ti ti-x text-lg"></i>
    </Dialog.Close>
  );
}

