import { cva } from "class-variance-authority";

export const summaryCardVariants = cva([
  "flex",
  "flex-col",
  "gap-5",

  "rounded-[var(--radius-lg)]",

  "border",
  "border-[var(--color-border)]",

  "bg-[var(--color-bg-surface)]",

  "p-6",
]);

export const summaryHeaderVariants = cva([
  "flex",
  "items-start",
  "justify-between",
  "gap-4",
]);

export const summaryContentVariants = cva([
  "space-y-4",
]);

export const summaryFooterVariants = cva([
  "flex",
  "items-center",
  "justify-between",

  "pt-2",

  "border-t",
  "border-[var(--color-border)]",
]);