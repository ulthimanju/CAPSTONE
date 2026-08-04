import { cva } from "class-variance-authority";

export const skeletonVariants = cva(
  [
    "relative",
    "overflow-hidden",
    "bg-[var(--color-bg-secondary)]",
    "select-none",
    "pointer-events-none",
  ],
  {
    variants: {
      shape: {
        rounded: "rounded-[var(--radius-sm)]",

        circle: "rounded-full",

        square: "rounded-none",
      },

      animation: {
        pulse: "animate-pulse",

        wave: "",
      },
    },

    defaultVariants: {
      shape: "rounded",

      animation: "wave",
    },
  }
);

export const skeletonWaveVariants = cva([
  "absolute",
  "inset-0",

  "translate-x-[-100%]",

  "animate-[skeleton-wave_1.5s_ease-in-out_infinite]",

  "bg-gradient-to-r",

  "from-transparent",

  "via-white/5",

  "to-transparent",
]);