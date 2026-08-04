import { forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

import { Typography } from "@/components/ui";

import { textareaVariants } from "./Textarea.variants";

const TEXTAREA_LAYOUT = {
  wrapper: "flex flex-col gap-2",
};

export const Textarea = forwardRef(function Textarea(
  {
    id,

    label,

    helperText,

    error,

    variant = "default",

    size = "md",

    resize = "vertical",

    rows = 5,

    required = false,

    fullWidth = true,

    className,

    ...props
  },
  ref
) {
  const generatedId = useId();

  const textareaId = id ?? generatedId;

  const helperId = `${textareaId}-helper`;

  const errorId = `${textareaId}-error`;

  return (
    <div
      className={cn(
        TEXTAREA_LAYOUT.wrapper,
        fullWidth && "w-full"
      )}
    >
      {label && (
        <Typography
          as="label"
          htmlFor={textareaId}
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

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? errorId
            : helperText
              ? helperId
              : undefined
        }
        className={cn(
          textareaVariants({
            variant,
            size,
            resize,
            hasError: Boolean(error),
          }),
          className
        )}
        {...props}
      />

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
});