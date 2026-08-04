import { forwardRef, useId } from "react";

import { cn } from "@/lib/cn";
import { Typography } from "@/components/ui";

import {
  radioVariants,
  radioIndicatorVariants,
} from "./Radio.variants";

const RADIO_LAYOUT = {
  wrapper: "flex flex-col gap-2",

  row: "flex items-start gap-3",

  content: "flex-1 flex flex-col gap-1",
};

export const Radio = forwardRef(function Radio(
  {
    id,

    name,

    value,

    checked = false,

    onChange,

    label,

    helperText,

    error,

    required = false,

    disabled = false,

    size = "md",

    className,

    ...props
  },
  ref
) {
  const generatedId = useId();

  const radioId = id ?? generatedId;

  const helperId = `${radioId}-helper`;

  const errorId = `${radioId}-error`;

  return (
    <div className={RADIO_LAYOUT.wrapper}>
      <label
        htmlFor={radioId}
        className={RADIO_LAYOUT.row}
      >
        <input
          ref={ref}
          id={radioId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? errorId
              : helperText
                ? helperId
                : undefined
          }
          onChange={onChange}
          className="sr-only"
          {...props}
        />

        <span
          className={cn(
            radioVariants({
              size,
              checked,
              hasError: Boolean(error),
            }),
            className
          )}
        >
          <span
            className={radioIndicatorVariants({
              size,
              checked,
            })}
          />
        </span>

        <span className={RADIO_LAYOUT.content}>
          {label && (
            <Typography
              variant="body-small"
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
        </span>
      </label>
    </div>
  );
});