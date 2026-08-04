import { cva } from "class-variance-authority";

export const radioVariants = cva(
  [
    "relative",
    "inline-flex",
    "items-center",
    "justify-center",
    "shrink-0",

    "rounded-full",
    "border",

    "transition-colors",
    "duration-200",

    "cursor-pointer",

    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-[var(--color-primary)]/20",

    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
      },

      checked: {
        true:
          "border-[var(--color-primary)] bg-[var(--color-primary)]/10",

        false:
          "border-[var(--color-border)] bg-[var(--color-bg-surface)]",
      },

      hasError: {
        true:
          "border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/20",

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

export const radioIndicatorVariants = cva(
  [
    "rounded-full",
    "bg-[var(--color-primary)]",
    "transition-transform",
    "duration-200",
    "ease-in-out",
  ],
  {
    variants: {
      size: {
        sm: "h-2 w-2",
        md: "h-2.5 w-2.5",
        lg: "h-3 w-3",
      },

      checked: {
        true: "scale-100",

        false: "scale-0",
      },
    },

    defaultVariants: {
      size: "md",
      checked: false,
    },
  }
);