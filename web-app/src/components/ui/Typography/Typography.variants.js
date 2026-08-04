import { cva } from "class-variance-authority";

export const typographyVariants = cva("", {
  variants: {
    variant: {
      display: "text-5xl leading-tight tracking-tight",
      h1: "text-4xl leading-tight tracking-tight",
      h2: "text-3xl leading-snug",
      h3: "text-2xl leading-snug",

      title: "text-xl leading-normal",

      body: "text-base leading-7",

      "body-small": "text-sm leading-6",

      label: "text-sm",

      caption: "text-xs",

      button: "text-sm",

      mono: "font-mono text-sm",
    },

    weight: {
      regular: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },

    color: {
      default: "text-[var(--color-text-primary)]",

      muted: "text-[var(--color-text-secondary)]",

      disabled: "text-[var(--color-text-disabled)]",

      primary: "text-[var(--color-primary)]",

      success: "text-[var(--color-success)]",

      danger: "text-[var(--color-danger)]",

      inherit: "text-inherit",
    },

    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },

    truncate: {
      true: "truncate",
      false: "",
    },
  },
  
  defaultVariants: {
    variant: "body",
    weight: "regular",
    color: "default",
    align: "left",
    truncate: false,
  },
});