import { cva } from "class-variance-authority";

export const progressTrackVariants = cva(
  [
    "relative",
    "w-full",
    "overflow-hidden",
    "rounded-full",
    "bg-[var(--color-bg-secondary)]",
  ],
  {
    variants: {
      size: {
        sm: "h-1.5",

        md: "h-2.5",

        lg: "h-4",
      },
    },

    defaultVariants: {
      size: "md",
    },
  }
);

export const progressIndicatorVariants = cva(
  [
    "h-full",
    "rounded-full",
    "transition-[width]",
    "duration-300",
    "ease-out",
  ],
  {
    variants: {
      color: {
        primary: "bg-[var(--color-primary)]",

        success: "bg-[var(--color-success)]",

        warning: "bg-[var(--color-warning)]",

        danger: "bg-[var(--color-danger)]",

        info: "bg-[var(--color-info)]",
      },

      indeterminate: {
        true: "animate-pulse",

        false: "",
      },
    },

    defaultVariants: {
      color: "primary",

      indeterminate: false,
    },
  }
);