import { cva } from "class-variance-authority";

export const workspaceCardVariants = cva(
  [
    "group",

    "flex",
    "flex-col",

    "gap-5",

    "rounded-[var(--radius-lg)]",

    "border",

    "border-[var(--color-border)]",

    "bg-[var(--color-bg-surface)]",

    "p-5",

    "transition-all",

    "duration-200",

    "hover:border-[var(--color-border-strong)]",
  ]
);

export const workspaceCardHeaderVariants = cva([
  "flex",

  "items-start",

  "justify-between",

  "gap-4",
]);

export const workspaceCardMetaVariants = cva([
  "flex",

  "items-center",

  "gap-4",

  "text-sm",
]);

export const workspaceCardFooterVariants = cva([
  "flex",

  "items-center",

  "justify-between",

  "pt-2",
]);