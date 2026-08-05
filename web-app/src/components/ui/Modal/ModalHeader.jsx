import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { modalHeaderVariants } from "./Modal.variants";

export function ModalHeader({ title, description, className, children, ...props }) {
  return (
    <div className={cn(modalHeaderVariants(), className)} {...props}>
      {title && (
        <Dialog.Title className="text-lg font-semibold text-[#e4e4e7] pr-8">
          {title}
        </Dialog.Title>
      )}
      {description && (
        <Dialog.Description className="text-xs text-[#a1a1aa] mt-1">
          {description}
        </Dialog.Description>
      )}
      {children}
    </div>
  );
}

