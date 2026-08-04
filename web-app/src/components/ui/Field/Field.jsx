import { cloneElement } from "react";

import { cn } from "@/lib/cn";
import { Typography } from "@/components/ui";

const FIELD_LAYOUT = {
  wrapper: "flex flex-col gap-2",
};

export function Field({
  id,
  label,
  required = false,
  helperText,
  error,
  fullWidth = true,
  className,
  children,
}) {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  const describedBy = error
    ? errorId
    : helperText
      ? helperId
      : undefined;

  const control = cloneElement(children, {
    id,
    required,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
  });

  return (
    <div
      className={cn(
        FIELD_LAYOUT.wrapper,
        fullWidth && "w-full",
        className
      )}
    >
      {label && (
        <Typography
          as="label"
          htmlFor={id}
          variant="label"
          weight="medium"
        >
          {label}

          {required && (
            <Typography
              as="span"
              color="danger"
            >
              {" *"}
            </Typography>
          )}
        </Typography>
      )}

      {control}

      {error ? (
        <Typography
          id={errorId}
          variant="caption"
          color="danger"
        >
          {error}
        </Typography>
      ) : (
        helperText && (
          <Typography
            id={helperId}
            variant="caption"
            color="muted"
          >
            {helperText}
          </Typography>
        )
      )}
    </div>
  );
}