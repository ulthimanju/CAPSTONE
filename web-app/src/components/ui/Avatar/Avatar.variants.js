import { cva } from "class-variance-authority";

export const avatarVariants = cva(
  [
    "relative",
    "inline-flex",
    "items-center",
    "justify-center",
    "overflow-hidden",
    "select-none",
    "shrink-0",
    "bg-[var(--color-bg-secondary)]",
    "border",
    "border-[var(--color-border-default)]",
    "text-[var(--color-text-primary)]",
    "font-[var(--font-weight-semibold)]",
  ],
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[var(--font-size-xs)]",
        sm: "h-8 w-8 text-[var(--font-size-xs)]",
        md: "h-10 w-10 text-[var(--font-size-sm)]",
        lg: "h-12 w-12 text-[var(--font-size-base)]",
        xl: "h-16 w-16 text-[var(--font-size-lg)]",
      },

      shape: {
        circle: "rounded-full",
        square: "rounded-[var(--radius-md)]",
      },
    },

    defaultVariants: {
      size: "md",
      shape: "circle",
    },
  }
);

export const avatarImageVariants = cva([
  "h-full",
  "w-full",
  "object-cover",
]);

export const avatarStatusVariants = cva(
  [
    "absolute",
    "bottom-0",
    "right-0",
    "rounded-full",
    "border-2",
    "border-[var(--color-bg-base)]",
  ],
  {
    variants: {
      status: {
        online: "bg-[var(--color-success)]",
        away: "bg-[var(--color-warning)]",
        busy: "bg-[var(--color-danger)]",
        offline: "bg-[var(--color-text-muted)]",
      },

      size: {
        xs: "h-2 w-2",
        sm: "h-2.5 w-2.5",
        md: "h-3 w-3",
        lg: "h-3.5 w-3.5",
        xl: "h-4 w-4",
      },
    },

    defaultVariants: {
      size: "md",
    },
  }
);