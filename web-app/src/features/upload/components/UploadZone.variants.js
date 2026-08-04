import { cva } from "class-variance-authority";

export const uploadZoneVariants = cva(
  [
    "relative",

    "flex",
    "flex-col",
    "items-center",
    "justify-center",

    "rounded-[var(--radius-lg)]",

    "border-2",
    "border-dashed",

    "transition-colors",
    "duration-200",

    "min-h-80",

    "p-8",
  ],
  {
    variants: {
      dragging: {
        true:
          "border-[var(--color-primary)] bg-[var(--color-primary)]/5",

        false:
          "border-[var(--color-border)] bg-[var(--color-bg-surface)]",
      },
    },

    defaultVariants: {
      dragging: false,
    },
  }
);

export const uploadFileListVariants = cva([
  "mt-6",

  "flex",

  "w-full",

  "flex-col",

  "gap-3",
]);