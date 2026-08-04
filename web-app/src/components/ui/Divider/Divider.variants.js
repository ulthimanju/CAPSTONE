import { cva } from "class-variance-authority";

export const dividerVariants = cva([], {
  variants: {
    orientation: {
      horizontal: "w-full border-t border-[var(--color-border)]",

      vertical: "h-full border-l border-[var(--color-border)]",
    },

    spacing: {
      none: "",

      sm: "my-2",

      md: "my-4",

      lg: "my-6",

      xl: "my-8",
    },
  },

  defaultVariants: {
    orientation: "horizontal",

    spacing: "md",
  },
});

export const dividerLabelVariants = cva(
  [
    "px-3",

    "text-xs",

    "font-medium",

    "uppercase",

    "tracking-wide",

    "text-[var(--color-text-muted)]",

    "whitespace-nowrap",
  ]
);