import { cva } from "class-variance-authority";

export const breadcrumbVariants = cva([
  "flex",
  "items-center",
  "flex-wrap",
  "gap-1",
]);

export const breadcrumbItemVariants = cva(
  [
    "inline-flex",
    "items-center",
    "gap-2",
    "min-w-0",
  ],
  {
    variants: {
      current: {
        true: "text-[var(--color-text-primary)]",
        false:
          "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors",
      },
    },

    defaultVariants: {
      current: false,
    },
  }
);

export const breadcrumbSeparatorVariants = cva([
  "mx-1",
  "text-[var(--color-text-muted)]",
]);