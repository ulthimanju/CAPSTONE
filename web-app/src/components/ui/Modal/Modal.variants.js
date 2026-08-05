import { cva } from "class-variance-authority";

export const modalOverlayVariants = cva([
  "fixed",
  "inset-0",
  "z-50",
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
    "z-50",
    "flex",
    "max-h-[90vh]",
    "w-full",
    "flex-col",
    "overflow-hidden",
    "rounded-xl",
    "border",
    "border-[#2a2a2e]",
    "bg-[#16161a]",
    "text-[#e4e4e7]",
    "shadow-2xl",
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
        xs: "max-w-xs",
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-[95vw] h-[90vh]",
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
  "gap-1",
  "p-6",
  "pb-4",
  "border-b",
  "border-[#2a2a2e]",
]);

export const modalBodyVariants = cva([
  "flex-1",
  "overflow-y-auto",
  "p-6",
  "space-y-4",
]);

export const modalFooterVariants = cva([
  "flex",
  "items-center",
  "justify-end",
  "gap-3",
  "p-6",
  "pt-4",
  "border-t",
  "border-[#2a2a2e]",
]);

