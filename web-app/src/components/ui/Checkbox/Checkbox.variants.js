import { cva } from "class-variance-authority";

export const checkboxVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "border",
    "transition-all",
    "duration-200",
    "shrink-0",
    "select-none",

    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-[var(--color-primary-alpha-20)]",

    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-4 rounded-[var(--radius-xs)]",

        md: "h-5 w-5 rounded-[var(--radius-sm)]",

        lg: "h-6 w-6 rounded-[var(--radius-md)]",
      },

      checked: {
        true:
          "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-inverse)]",

        false:
          "bg-[var(--color-bg-surface)] border-[var(--color-border-default)]",
      },

      hasError: {
        true:
          "border-[var(--color-danger)] focus-visible:ring-[var(--color-danger-alpha-20)]",

        false: "",
      },
    },

    defaultVariants: {
      size: "md",
      checked: false,
      hasError: false,
    },
  }
);