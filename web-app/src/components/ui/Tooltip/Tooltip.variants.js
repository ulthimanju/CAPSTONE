import { cva } from "class-variance-authority";

export const tooltipContentVariants = cva(
  [
    "z-50",
    "max-w-xs",

    "rounded-[var(--radius-sm)]",

    "border",
    "border-[var(--color-border)]",

    "bg-[var(--color-bg-surface)]",

    "px-3",
    "py-2",

    "text-xs",
    "font-medium",

    "text-[var(--color-text-primary)]",

    "shadow-md",

    "select-none",

    "animate-in",
    "fade-in-0",
    "zoom-in-95",

    "data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0",
    "data-[state=closed]:zoom-out-95",
  ]
);