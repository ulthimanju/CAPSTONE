import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-[var(--space-2.5)]",
    "rounded-[var(--radius-sm)]",
    "transition-all",
    "duration-200",
    "cursor-pointer",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-[var(--color-primary)]",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:brightness-95 shadow-[var(--elevation-sm)]",

        secondary:
          "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-[var(--color-bg-tertiary)]",

        outline:
          "border border-[var(--color-border-strong)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]",

        ghost:
          "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]",

        danger:
          "bg-[var(--color-danger)] text-[var(--color-text-inverse)] hover:brightness-95",
      },

      size: {
        sm: "h-[var(--dimension-button-sm)] px-[var(--space-3)] text-[var(--font-size-sm)]",

        md: "h-[var(--dimension-button-md)] px-[var(--space-4)] text-[var(--font-size-base)]",

        lg: "h-[var(--dimension-button-lg)] px-[var(--space-6)] text-[var(--font-size-lg)]",
      },

      fullWidth: {
        true: "w-full",

        false: "",
      },
    },

    defaultVariants: {
      variant: "primary",

      size: "md",

      fullWidth: false,
    },
  }
);