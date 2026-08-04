import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "font-medium",
    "border",
    "transition-colors",
    "select-none",
    "whitespace-nowrap",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]",

        primary:
          "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20",

        success:
          "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",

        warning:
          "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",

        danger:
          "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20",

        info:
          "bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20",

        neutral:
          "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
      },

      size: {
        sm: "h-5 px-2 text-xs",

        md: "h-6 px-2.5 text-sm",

        lg: "h-8 px-3 text-sm",
      },

      rounded: {
        true: "rounded-full",

        false: "rounded-[var(--radius-sm)]",
      },
    },

    defaultVariants: {
      variant: "default",

      size: "md",

      rounded: false,
    },
  }
);