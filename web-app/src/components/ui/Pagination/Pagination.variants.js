import { cva } from "class-variance-authority";

export const paginationVariants = cva([
  "flex",
  "items-center",
  "justify-between",
  "gap-4",
  "w-full",
]);

export const paginationListVariants = cva([
  "flex",
  "items-center",
  "gap-1",
]);

export const paginationButtonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",

    "h-9",
    "min-w-9",

    "rounded-[var(--radius-sm)]",

    "border",

    "transition-colors",

    "duration-200",

    "select-none",

    "focus-visible:outline-none",

    "focus-visible:ring-2",

    "focus-visible:ring-[var(--color-primary)]/20",

    "disabled:pointer-events-none",

    "disabled:opacity-50",
  ],
  {
    variants: {
      active: {
        true:
          "bg-[var(--color-primary)] border-[var(--color-primary)] text-black",

        false:
          "bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]",
      },
    },

    defaultVariants: {
      active: false,
    },
  }
);