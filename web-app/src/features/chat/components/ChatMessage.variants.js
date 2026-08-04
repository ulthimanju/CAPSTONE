import { cva } from "class-variance-authority";

export const chatMessageVariants = cva(
  [
    "flex",
    "gap-4",
    "w-full",
    "py-6",
  ],
  {
    variants: {
      role: {
        assistant: "",

        user: "flex-row-reverse",
      },
    },

    defaultVariants: {
      role: "assistant",
    },
  }
);

export const chatBubbleVariants = cva(
  [
    "flex",
    "flex-col",

    "gap-3",

    "max-w-4xl",

    "rounded-[var(--radius-lg)]",

    "border",

    "p-5",
  ],
  {
    variants: {
      role: {
        assistant:
          "border-[var(--color-border)] bg-[var(--color-bg-surface)]",

        user:
          "border-[var(--color-primary)] bg-[var(--color-primary)]/5",
      },
    },

    defaultVariants: {
      role: "assistant",
    },
  }
);

export const chatHeaderVariants = cva([
  "flex",

  "items-center",

  "justify-between",

  "gap-3",
]);

export const chatFooterVariants = cva([
  "flex",

  "items-center",

  "justify-between",

  "pt-2",
]);