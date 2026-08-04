import { cn } from "@/lib/cn";

import { Typography } from "@/components/ui";

import {
  progressIndicatorVariants,
  progressTrackVariants,
} from "./Progress.variants";

const PROGRESS_LAYOUT = {
  wrapper: "flex flex-col gap-2",

  header: "flex items-center justify-between gap-3",
};

export function Progress({
  value = 0,

  label,

  showValue = false,

  size = "md",

  color = "primary",

  indeterminate = false,

  className,

  ...props
}) {
  const progress = Math.min(
    100,
    Math.max(0, value)
  );

  return (
    <div
      className={cn(
        PROGRESS_LAYOUT.wrapper,
        className
      )}
      {...props}
    >
      {(label || showValue) && (
        <div className={PROGRESS_LAYOUT.header}>
          {label && (
            <Typography
              variant="label"
              weight="medium"
            >
              {label}
            </Typography>
          )}

          {showValue && !indeterminate && (
            <Typography
              variant="caption"
              color="muted"
            >
              {progress}%
            </Typography>
          )}
        </div>
      )}

      <div
        className={progressTrackVariants({
          size,
        })}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          indeterminate ? undefined : progress
        }
      >
        <div
          className={progressIndicatorVariants({
            color,
            indeterminate,
          })}
          style={{
            width: indeterminate
              ? "40%"
              : `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}