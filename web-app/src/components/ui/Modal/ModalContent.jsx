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
  style,
  ...props
}) {
  const sizeWidths = {
    xs: '320px',
    sm: '400px',
    md: '520px',
    lg: '680px',
    xl: '880px',
    full: '95vw',
  };

  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className="fixed inset-0 z-[999]"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <Dialog.Content
        onInteractOutside={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
        className={cn(modalContentVariants({ size, position }), "z-[10000]", className)}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10000,
          width: '90%',
          maxWidth: sizeWidths[size] || '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#16161a',
          color: '#e4e4e7',
          border: '1px solid #2a2a32',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
          ...style,
        }}
        {...props}
      >
        {showCloseButton && (
          <div style={{ position: 'absolute', right: '16px', top: '16px', zIndex: 10 }}>
            <ModalCloseButton />
          </div>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

