import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "rounded-[var(--radius-sm)]",
    "transition-colors",
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
          "bg-[var(--color-primary)] text-black hover:brightness-95",

        secondary:
          "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]",

        outline:
          "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-bg-secondary)]",

        ghost:
          "bg-transparent hover:bg-[var(--color-bg-secondary)]",

        danger:
          "bg-[var(--color-danger)] text-white hover:brightness-95",
      },

      size: {
        sm: "h-8 px-3",

        md: "h-10 px-4",

        lg: "h-12 px-6",
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