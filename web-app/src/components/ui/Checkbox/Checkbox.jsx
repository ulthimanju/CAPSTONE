import { forwardRef, useId } from "react";

import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

import { Typography } from "@/components/ui";

import { checkboxVariants } from "./Checkbox.variants";

const CHECKBOX_LAYOUT = {
  wrapper: "flex flex-col gap-2",

  row: "flex items-start gap-3",

  content: "flex flex-col gap-1",
};

const CHECK_ICON_SIZE = {
  sm: 12,
  md: 14,
  lg: 16,
};

export const Checkbox = forwardRef(function Checkbox(
  {
    id,

    label,

    helperText,

    error,

    checked = false,

    onCheckedChange,

    size = "md",

    className,

    disabled = false,

    required = false,

    ...props
  },
  ref
) {
  const generatedId = useId();

  const checkboxId = id ?? generatedId;

  const helperId = `${checkboxId}-helper`;

  const errorId = `${checkboxId}-error`;

  return (
    <div className={CHECKBOX_LAYOUT.wrapper}>
      <label
        htmlFor={checkboxId}
        className={CHECKBOX_LAYOUT.row}
      >
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? errorId
              : helperText
                ? helperId
                : undefined
          }
          onChange={(e) =>
            onCheckedChange?.(e.target.checked)
          }
          className="sr-only"
          {...props}
        />

        <span
          className={cn(
            checkboxVariants({
              size,
              checked,
              hasError: Boolean(error),
            }),
            className
          )}
        >
          {checked && (
            <Check
              size={CHECK_ICON_SIZE[size]}
              strokeWidth={3}
            />
          )}
        </span>

        <span className={CHECKBOX_LAYOUT.content}>
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