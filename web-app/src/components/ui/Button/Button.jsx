import React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";

const contentSizeMap = {
  sm: "xs",
  md: "sm",
  lg: "md",
};

const spinnerColorMap = {
  primary: "default",
  secondary: "primary",
  outline: "primary",
  ghost: "primary",
  danger: "default",
};

/**
 * Generic button component.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {"primary"|"secondary"|"outline"|"ghost"|"danger"} [props.variant]
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {string} [props.leftIcon]
 * @param {string} [props.rightIcon]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.fullWidth]
 * @param {string} [props.className]
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  style,
  ...props
}) {
  const contentSize = contentSizeMap[size];
  const spinnerColor = spinnerColorMap[variant];
  const isDisabled = disabled || loading;

  const sizeClass = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
  }[size] || "";

  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    danger: "btn-danger",
  }[variant] || "btn-primary";

  return (
    <button
      type="button"
      className={cn(
        "btn",
        variantClass,
        sizeClass,
        fullWidth && "btn-full",
        className
      )}
      style={{
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Spinner size={contentSize} color={spinnerColor} />
      ) : (
        leftIcon && <Icon name={leftIcon} size={contentSize} />
      )}

      <span>{children}</span>

      {!loading && rightIcon && <Icon name={rightIcon} size={contentSize} />}
    </button>
  );
}