import { cva } from "class-variance-authority";

export const dropdownContentVariants = cva(
  [
    "z-[var(--z-dropdown)]",
    "min-w-56",
    "overflow-hidden",

    "rounded-[var(--radius-md)]",

    "border",
    "border-[var(--color-border-default)]",

    "bg-[var(--color-bg-surface)]",

    "shadow-[var(--elevation-md)]",

    "animate-in",
    "fade-in-0",
    "zoom-in-95",

    "data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0",
    "data-[state=closed]:zoom-out-95",
  ]
);

export const dropdownItemVariants = cva(
  [
    "relative",

    "flex",
    "items-center",
    "gap-[var(--space-3)]",

    "cursor-pointer",
    "select-none",

    "rounded-[var(--radius-xs)]",

    "px-[var(--space-3)]",
    "py-[var(--space-2)]",

    "text-[var(--font-size-sm)]",

    "outline-none",

    "transition-colors",

    "data-[highlighted]:bg-[var(--color-bg-secondary)]",

    "data-[disabled]:pointer-events-none",
    "data-[disabled]:opacity-50",
  ],
  {
    variants: {
      variant: {
        default:
          "text-[var(--color-text-primary)]",

        danger:
          "text-[var(--color-danger)]",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  }
);

export const dropdownLabelVariants = cva([
  "px-[var(--space-3)]",
  "py-[var(--space-2)]",

  "text-[var(--font-size-xs)]",

  "font-[var(--font-weight-semibold)]",

  "uppercase",

  "tracking-wide",

  "text-[var(--color-text-muted)]",
]);

export const dropdownSeparatorVariants = cva([
  "my-1",
  "h-px",
  "bg-[var(--color-border-default)]",
]);