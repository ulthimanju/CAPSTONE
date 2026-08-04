import { cva } from "class-variance-authority";

export const selectTriggerVariants = cva(
  [
    "flex",
    "w-full",
    "items-center",
    "justify-between",
    "gap-3",

    "rounded-[var(--radius-sm)]",
    "border",

    "transition-colors",
    "duration-200",

    "outline-none",

    "text-left",

    "disabled:cursor-not-allowed",
    "disabled:opacity-50",

    "focus:ring-2",
    "focus:ring-[var(--color-primary)]/20",
    "focus:border-[var(--color-primary)]",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]",

        filled:
          "bg-[var(--color-bg-secondary)] border-transparent text-[var(--color-text-primary)]",

        ghost:
          "bg-transparent border-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]",
      },

      size: {
        sm: "h-9 px-3 text-sm",

        md: "h-10 px-4 text-sm",

        lg: "h-12 px-5 text-base",
      },

      hasError: {
        true:
          "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20",

        false: "",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "md",
      hasError: false,
    },
  }
);

export const selectContentVariants = cva(
  [
    "z-50",
    "overflow-hidden",

    "rounded-[var(--radius-md)]",

    "border",
    "border-[var(--color-border)]",

    "bg-[var(--color-bg-surface)]",

    "shadow-md",

    "animate-in",
    "fade-in-0",
    "zoom-in-95",
  ]
);

export const selectItemVariants = cva(
  [
    "relative",

    "flex",
    "cursor-pointer",
    "select-none",
    "items-center",

    "rounded-[var(--radius-xs)]",

    "px-3",
    "py-2",

    "text-sm",

    "outline-none",

    "transition-colors",

    "data-[highlighted]:bg-[var(--color-bg-secondary)]",

    "data-[disabled]:pointer-events-none",
    "data-[disabled]:opacity-50",
  ]
);

export const selectLabelVariants = cva([
  "px-3",
  "py-2",
  "text-xs",
  "font-semibold",
  "text-[var(--color-text-muted)]",
]);

export const selectSeparatorVariants = cva([
  "my-1",
  "h-px",
  "bg-[var(--color-border)]",
]); 