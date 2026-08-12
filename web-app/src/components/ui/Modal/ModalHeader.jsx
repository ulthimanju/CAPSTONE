import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { modalHeaderVariants } from "./Modal.variants";

export function ModalHeader({ title, description, className, children, ...props }) {
  return (
    <div className={cn(modalHeaderVariants(), className)} {...props}>
      {title && (
        <Dialog.Title className="text-[var(--font-size-xl)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] pr-8">
          {title}
        </Dialog.Title>
      )}
      {description && (
        <Dialog.Description className="text-[var(--font-size-xs)] text-[var(--color-text-secondary)] mt-1">
          {description}
        </Dialog.Description>
      )}
      {children}
    </div>
  );
}
