import { cva } from "class-variance-authority";

export const navbarVariants = cva([
  "sticky",
  "top-0",
  "z-40",

  "flex",
  "items-center",
  "justify-between",

  "h-16",
  "w-full",

  "border-b",
  "border-[var(--color-border)]",

  "bg-[var(--color-bg)]",

  "px-6",

  "transition-colors",
]);

export const navbarSectionVariants = cva(
  [
    "flex",
    "items-center",
    "gap-3",

    "min-w-0",
  ],
  {
    variants: {
      align: {
        left: "justify-start flex-1",

        center: "justify-center",

        right: "justify-end flex-1",
      },
    },

    defaultVariants: {
      align: "left",
    },
  }
);

export const navbarItemVariants = cva([
  "inline-flex",

  "items-center",

  "gap-2",

  "shrink-0",
]);