import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { modalContentVariants } from "./Modal.variants";
import { ModalCloseButton } from "./ModalCloseButton";

export function ModalContent({
  size = "md",
  position = "center",
  closeOnOutsideClick = true,
  showCloseButton = true,
  className,
  children,
  style,
  ...props
}) {
  const sizeWidths = {
    xs: 'var(--dimension-modal-sm)',
    sm: 'var(--dimension-modal-sm)',
    md: 'var(--dimension-modal-md)',
    lg: 'var(--dimension-modal-lg)',
    xl: 'var(--dimension-modal-xl)',
    full: 'var(--dimension-modal-full)',
  };

  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className="fixed inset-0 z-[var(--z-modal-backdrop)]"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 'var(--z-modal-backdrop)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <Dialog.Content
        onInteractOutside={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
        className={cn(modalContentVariants({ size, position }), className)}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 'var(--z-modal)',
          width: '90%',
          maxWidth: sizeWidths[size] || 'var(--dimension-modal-md)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg-surface)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--elevation-overlay)',
          ...style,
        }}
        {...props}
      >
        {showCloseButton && (
          <div style={{ position: 'absolute', right: 'var(--space-4)', top: 'var(--space-4)', zIndex: 10 }}>
            <ModalCloseButton />
          </div>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
