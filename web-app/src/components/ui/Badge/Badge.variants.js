import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "font-[var(--font-weight-medium)]",
    "border",
    "transition-colors",
    "select-none",
    "whitespace-nowrap",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border-default)]",

        primary:
          "bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border-[var(--color-primary-alpha-20)]",

        success:
          "bg-[var(--color-success-subtle)] text-[var(--color-success-text)] border-[var(--color-success-alpha-20)]",

        warning:
          "bg-[var(--color-warning-subtle)] text-[var(--color-warning-text)] border-[var(--color-warning-alpha-20)]",

        danger:
          "bg-[var(--color-danger-subtle)] text-[var(--color-danger-text)] border-[var(--color-danger-alpha-20)]",

        info:
          "bg-[var(--color-info-subtle)] text-[var(--color-info-text)] border-[var(--color-info-alpha-20)]",

        neutral:
          "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]",
      },

      size: {
        sm: "h-5 px-[var(--space-2)] text-[var(--font-size-xs)]",

        md: "h-6 px-[var(--space-2.5)] text-[var(--font-size-sm)]",

        lg: "h-8 px-[var(--space-3)] text-[var(--font-size-sm)]",
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