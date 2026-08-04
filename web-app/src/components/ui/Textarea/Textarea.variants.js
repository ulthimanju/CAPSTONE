import { cva } from "class-variance-authority";

export const textareaVariants = cva(
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
    "focus:ring-[var(--color-primary)]/20",
  ],
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border)]",

        filled:
          "border-transparent bg-[var(--color-bg-secondary)]",

        ghost:
          "border-transparent bg-transparent",
      },

      size: {
        sm: "p-3 text-sm",

        md: "p-4 text-sm",

        lg: "p-5 text-base",
      },

      resize: {
        none: "resize-none",

        vertical: "resize-y",

        horizontal: "resize-x",

        both: "resize",
      },

      hasError: {
        true:
          "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20",

        false: "",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "md",
      resize: "vertical",
      hasError: false,
    },
  }
);