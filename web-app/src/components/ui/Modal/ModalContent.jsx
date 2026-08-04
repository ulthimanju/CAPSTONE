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
      <Dialog.Overlay className={modalOverlayVariants()} />
      <Dialog.Content
        onInteractOutside={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
        className={cn(modalContentVariants({ size, position }), className)}
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
