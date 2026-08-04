import { cva } from "class-variance-authority";

export const flashcardVariants = cva([
  "relative",

  "flex",

  "min-h-80",

  "flex-col",

  "justify-between",

  "rounded-[var(--radius-lg)]",

  "border",

  "border-[var(--color-border)]",

  "bg-[var(--color-bg-surface)]",

  "p-6",

  "transition-all",

  "duration-300",
]);

export const flashcardFaceVariants = cva([
  "flex",

  "flex-1",

  "items-center",

  "justify-center",

  "text-center",
]);

export const flashcardFooterVariants = cva([
  "flex",

  "items-center",

  "justify-between",

  "gap-4",

  "pt-6",

  "border-t",

  "border-[var(--color-border)]",
]);