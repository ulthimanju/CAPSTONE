import { cva } from "class-variance-authority";

export const cardVariants = cva(
  [
    "rounded-[var(--radius-lg)]",
    "border",
    "border-[var(--color-border-default)]",
    "transition-colors",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-bg-surface)]",

        outlined:
          "bg-transparent",

        elevated:
          "bg-[var(--color-bg-surface)] shadow-[var(--elevation-md)]",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  }
);