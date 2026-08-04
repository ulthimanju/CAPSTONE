import { cn } from "@/lib/cn";
import { modalFooterVariants } from "./Modal.variants";

export function ModalFooter({ className, children, ...props }) {
  return (
    <div className={cn(modalFooterVariants(), className)} {...props}>
      {children}
    </div>
  );
}
