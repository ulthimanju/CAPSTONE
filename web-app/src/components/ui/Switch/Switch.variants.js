import { cva } from "class-variance-authority";

export const switchTrackVariants = cva(
  [
    "relative",
    "inline-flex",
    "shrink-0",
    "cursor-pointer",
    "rounded-full",

    "transition-colors",
    "duration-200",

    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-[var(--color-primary)]/20",

    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "h-5 w-10",
        md: "h-6 w-11",
        lg: "h-7 w-14",
      },

      checked: {
        true: "bg-[var(--color-primary)] hover:brightness-105",

        false:
          "bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]",
      },

      hasError: {
        true: "ring-2 ring-[var(--color-danger)]/30",

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

export const switchThumbVariants = cva(
  [
    "absolute",

    "top-0.5",
    "left-0.5",

    "rounded-full",

    "bg-white",

    "shadow-sm",

    "transition-transform",
    "duration-200",
    "ease-in-out",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-4",

        md: "h-5 w-5",

        lg: "h-6 w-6",
      },

      checked: {
        true: "",

        false: "",
      },
    },

    compoundVariants: [
      {
        size: "sm",
        checked: false,
        className: "translate-x-0",
      },
      {
        size: "sm",
        checked: true,
        className: "translate-x-5",
      },

      {
        size: "md",
        checked: false,
        className: "translate-x-0",
      },
      {
        size: "md",
        checked: true,
        className: "translate-x-5",
      },

      {
        size: "lg",
        checked: false,
        className: "translate-x-0",
      },
      {
        size: "lg",
        checked: true,
        className: "translate-x-7",
      },
    ],

    defaultVariants: {
      size: "md",
      checked: false,
    },
  }
);