import { cva } from "class-variance-authority";

export const inputVariants = cva(
  [
    "w-full",
    "rounded-[var(--radius-sm)]",
    "border",
    "bg-[var(--color-bg-surface)]",
    "text-[var(--color-text-primary)]",
    "transition-colors",
    "duration-200",
    "outline-none",

    "placeholder:text-[var(--color-text-muted)]",

    "disabled:cursor-not-allowed",
    "disabled:opacity-50",

    "focus:border-[var(--color-primary)]",
    "focus:ring-2",
    "focus:ring-[var(--color-primary-alpha-20)]",
  ],
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border-default)]",

        filled:
          "border-transparent bg-[var(--color-bg-secondary)]",

        ghost:
          "border-transparent bg-transparent",
      },

      size: {
        sm: "h-[var(--dimension-input-sm)] px-[var(--space-3)] text-[var(--font-size-sm)]",

        md: "h-[var(--dimension-input-md)] px-[var(--space-4)] text-[var(--font-size-sm)]",

        lg: "h-[var(--dimension-input-lg)] px-[var(--space-5)] text-[var(--font-size-base)]",
      },

      hasError: {
        true:
          "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger-alpha-20)]",

        false: "",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "md",
      hasError: false,
    },
  }
);