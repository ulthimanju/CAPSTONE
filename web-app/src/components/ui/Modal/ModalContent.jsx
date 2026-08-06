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
      <Dialog.Overlay
        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <Dialog.Content
        onInteractOutside={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
        className={cn(modalContentVariants({ size, position }), "z-[1000]", className)}
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
          ...props.style,
        }}
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

