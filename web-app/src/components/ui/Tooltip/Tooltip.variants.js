import { cva } from "class-variance-authority";

export const tooltipContentVariants = cva(
  [
    "z-[var(--z-tooltip)]",
    "max-w-xs",

    "rounded-[var(--radius-sm)]",

    "border",
    "border-[var(--color-border-default)]",

    "bg-[var(--color-bg-surface)]",

    "px-[var(--space-3)]",
    "py-[var(--space-2)]",

    "text-[var(--font-size-xs)]",
    "font-[var(--font-weight-medium)]",

    "text-[var(--color-text-primary)]",

    "shadow-[var(--elevation-sm)]",

    "select-none",

    "animate-in",
    "fade-in-0",
    "zoom-in-95",

    "data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0",
    "data-[state=closed]:zoom-out-95",
  ]
);