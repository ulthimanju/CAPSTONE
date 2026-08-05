import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { modalContentVariants, modalOverlayVariants } from "./Modal.variants";
import { ModalCloseButton } from "./ModalCloseButton";

export function ModalContent({
  size = "md",
  position = "center",
  closeOnOutsideClick = true,
  showCloseButton = true,
  className,
  children,
  ...props
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <Dialog.Content
        onInteractOutside={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
        className={cn(modalContentVariants({ size, position }), "z-[1000]", className)}
        {...props}
      >
        {showCloseButton && (
          <div className="absolute right-4 top-4 z-10">
            <ModalCloseButton />
          </div>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

