import { cva } from "class-variance-authority";

export const modalOverlayVariants = cva([
  "fixed",
  "inset-0",
  "z-[var(--z-modal-backdrop)]",
  "bg-black/80",
  "backdrop-blur-sm",
  "animate-in",
  "fade-in-0",
  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
]);

export const modalContentVariants = cva(
  [
    "fixed",
    "z-[var(--z-modal)]",
    "flex",
    "max-h-[90vh]",
    "w-full",
    "flex-col",
    "overflow-hidden",
    "rounded-[var(--radius-xl)]",
    "border",
    "border-[var(--color-border-default)]",
    "bg-[var(--color-bg-surface)]",
    "text-[var(--color-text-primary)]",
    "shadow-[var(--elevation-overlay)]",
    "outline-none",
    "transition-all",
    "animate-in",
    "fade-in-0",
    "zoom-in-95",
    "data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0",
    "data-[state=closed]:zoom-out-95",
  ],
  {
    variants: {
      size: {
        xs: "max-w-[var(--dimension-modal-sm)]",
        sm: "max-w-[var(--dimension-modal-sm)]",
        md: "max-w-[var(--dimension-modal-md)]",
        lg: "max-w-[var(--dimension-modal-lg)]",
        xl: "max-w-[var(--dimension-modal-xl)]",
        full: "max-w-[var(--dimension-modal-full)] h-[90vh]",
      },
      position: {
        center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        top: "top-12 left-1/2 -translate-x-1/2",
      },
    },
    defaultVariants: {
      size: "md",
      position: "center",
    },
  }
);

export const modalHeaderVariants = cva([
  "flex",
  "flex-col",
  "gap-[var(--space-1)]",
  "p-[var(--space-6)]",
  "pb-[var(--space-4)]",
  "border-b",
  "border-[var(--color-border-default)]",
]);

export const modalBodyVariants = cva([
  "flex-1",
  "overflow-y-auto",
  "p-[var(--space-6)]",
  "space-y-[var(--space-4)]",
]);

export const modalFooterVariants = cva([
  "flex",
  "items-center",
  "justify-end",
  "gap-[var(--space-3)]",
  "p-[var(--space-6)]",
  "pt-[var(--space-4)]",
  "border-t",
  "border-[var(--color-border-default)]",
]);
