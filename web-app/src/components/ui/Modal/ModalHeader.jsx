import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { modalHeaderVariants } from "./Modal.variants";

export function ModalHeader({ title, description, className, children, ...props }) {
  return (
    <div className={cn(modalHeaderVariants(), className)} {...props}>
      {title && (
        <Dialog.Title className="text-base font-semibold leading-tight text-[var(--color-text-primary)] pr-8">
          {title}
        </Dialog.Title>
      )}
      {description && (
        <Dialog.Description className="text-sm text-[var(--color-text-secondary)]">
          {description}
        </Dialog.Description>
      )}
      {children}
    </div>
  );
}
