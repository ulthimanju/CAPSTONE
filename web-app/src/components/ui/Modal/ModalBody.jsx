import { cn } from "@/lib/cn";
import { modalBodyVariants } from "./Modal.variants";

export function ModalBody({ className, children, ...props }) {
  return (
    <div className={cn(modalBodyVariants(), className)} {...props}>
      {children}
    </div>
  );
}
