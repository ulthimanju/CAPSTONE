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
    "border-[var(--color-border)]",
    "text-[var(--color-text-primary)]",
    "font-semibold",
  ],
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
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
    "border-[var(--color-bg)]",
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