import { cva } from "class-variance-authority";

export const quizCardVariants = cva([
  "flex",
  "flex-col",
  "gap-6",

  "rounded-[var(--radius-lg)]",

  "border",
  "border-[var(--color-border)]",

  "bg-[var(--color-bg-surface)]",

  "p-6",
]);

export const quizOptionsVariants = cva([
  "space-y-3",
]);

export const quizOptionVariants = cva(
  [
    "flex",
    "items-center",
    "gap-3",

    "rounded-[var(--radius-md)]",

    "border",

    "p-4",

    "cursor-pointer",

    "transition-colors",

    "duration-200",
  ],
  {
    variants: {
      state: {
        default:
          "border-[var(--color-border)] hover:border-[var(--color-primary)]",

        selected:
          "border-[var(--color-primary)] bg-[var(--color-primary)]/10",

        correct:
          "border-[var(--color-success)] bg-[var(--color-success)]/10",

        incorrect:
          "border-[var(--color-danger)] bg-[var(--color-danger)]/10",
      },
    },

    defaultVariants: {
      state: "default",
    },
  }
);

export const quizFooterVariants = cva([
  "flex",
  "items-center",
  "justify-between",

  "pt-4",

  "border-t",

  "border-[var(--color-border)]",
]);