import { cva } from "class-variance-authority";

export const dropdownContentVariants = cva(
  [
    "z-50",
    "min-w-56",
    "overflow-hidden",

    "rounded-[var(--radius-md)]",

    "border",
    "border-[var(--color-border)]",

    "bg-[var(--color-bg-surface)]",

    "shadow-md",

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
    "gap-3",

    "cursor-pointer",
    "select-none",

    "rounded-[var(--radius-xs)]",

    "px-3",
    "py-2",

    "text-sm",

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
  "px-3",
  "py-2",

  "text-xs",

  "font-semibold",

  "uppercase",

  "tracking-wide",

  "text-[var(--color-text-muted)]",
]);

export const dropdownSeparatorVariants = cva([
  "my-1",
  "h-px",
  "bg-[var(--color-border)]",
]);