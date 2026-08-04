import { forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

import { Icon, Typography } from "@/components/ui";

import { inputVariants } from "./Input.variants";

const INPUT_LAYOUT = {
  wrapper: "flex flex-col gap-2",

  inputWrapper: "relative",

  leftIcon: "absolute left-3 top-1/2 -translate-y-1/2",

  rightIcon: "absolute right-3 top-1/2 -translate-y-1/2",

  leftPadding: "pl-10",

  rightPadding: "pr-10",
};

const INPUT_ICON_SIZE = {
  sm: "xs",
  md: "sm",
  lg: "md",
};

/**
 * Generic input component.
 */
export const Input = forwardRef(function Input(
  {
    id,

    type = "text",

    label,

    helperText,

    error,

    leftIcon,

    rightIcon,

    onRightIconClick,

    variant = "default",

    size = "md",

    fullWidth = true,

    className,

    required = false,

    ...props
  },
  ref
) {
  const generatedId = useId();

  const inputId = id ?? generatedId;

  const helperId = `${inputId}-helper`;

  const errorId = `${inputId}-error`;

  const iconSize = INPUT_ICON_SIZE[size];

  return (
    <div
      className={cn(
        INPUT_LAYOUT.wrapper,
        fullWidth && "w-full"
      )}
    >
      {label && (
        <Typography
          as="label"
          htmlFor={inputId}
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

      <div className={INPUT_LAYOUT.inputWrapper}>
        {leftIcon && (
          <div className={INPUT_LAYOUT.leftIcon}>
            <Icon
              name={leftIcon}
              size={iconSize}
              color="muted"
              aria-hidden="true"
            />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? errorId
              : helperText
                ? helperId
                : undefined
          }
          required={required}
          className={cn(
            inputVariants({
              variant,
              size,
              hasError: Boolean(error),
            }),
            leftIcon && INPUT_LAYOUT.leftPadding,
            rightIcon && INPUT_LAYOUT.rightPadding,
            className
          )}
          {...props}
        />

        {rightIcon &&
          (onRightIconClick ? (
            <button
              type="button"
              onClick={onRightIconClick}
              className={cn(
                INPUT_LAYOUT.rightIcon,
                "cursor-pointer"
              )}
            >
              <Icon
                name={rightIcon}
                size={iconSize}
                color="muted"
              />
            </button>
          ) : (
            <div className={INPUT_LAYOUT.rightIcon}>
              <Icon
                name={rightIcon}
                size={iconSize}
                color="muted"
                aria-hidden="true"
              />
            </div>
          ))}
      </div>

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