import { cva } from "class-variance-authority";

export const pageHeaderVariants = cva([
  "flex",
  "items-start",
  "justify-between",
  "gap-6",

  "border-b",
  "border-[var(--color-border)]",

  "pb-6",
  "mb-6",
]);

export const pageHeaderContentVariants = cva([
  "flex",
  "min-w-0",
  "flex-col",
  "gap-2",
]);

export const pageHeaderActionsVariants = cva([
  "flex",
  "items-center",
  "gap-3",
  "shrink-0",
]);

export const pageHeaderBreadcrumbVariants = cva([
  "mb-2",
]);