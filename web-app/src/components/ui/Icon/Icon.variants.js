import { cva } from "class-variance-authority";

export const iconVariants = cva("", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
    },

    color: {
      default: "text-[var(--color-text-primary)]",
      muted: "text-[var(--color-text-secondary)]",
      disabled: "text-[var(--color-text-disabled)]",

      primary: "text-[var(--color-primary)]",

      success: "text-[var(--color-success)]",

      danger: "text-[var(--color-danger)]",
    },

    stroke: {
      thin: "",
      default: "",
      bold: "",
    },
  },

  defaultVariants: {
    size: "md",
    color: "default",
    stroke: "default",
  },
});