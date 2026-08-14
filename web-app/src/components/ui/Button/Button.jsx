import React, { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";
import "./button.css";

const spinnerColorMap = {
  primary: "default",
  secondary: "primary",
  outline: "primary",
  ghost: "primary",
  danger: "default",
  success: "default",
  link: "primary",
};

/**
 * Reusable Button Component system.
 * Handles primary, secondary, ghost, outline, danger, success, link variants,
 * sizes (sm, md, lg), fullWidth, icon composition, and native HTML button props.
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    icon,
    leftIcon,
    rightIcon,
    loading = false,
    disabled = false,
    type = "button",
    className,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  const isIconOnly = !children && Boolean(icon || leftIcon);

  // Variant class mapping
  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    outline: "btn-outline",
    danger: "btn-danger",
    success: "btn-success",
    link: "btn-link",
  }[variant] || "btn-primary";

  // Size class mapping
  const sizeClass = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  }[size] || "btn-md";

  const renderIcon = (iconToRender) => {
    if (!iconToRender) return null;
    return (
      <span className="btn-icon-wrapper" style={{ display: "inline-flex", alignItems: "center" }}>
        {iconToRender}
      </span>
    );
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "btn",
        variantClass,
        sizeClass,
        isIconOnly && "btn-icon",
        (icon || leftIcon || rightIcon) && !isIconOnly && "btn-with-icon",
        fullWidth && "btn-full",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Spinner size={size === "lg" ? "md" : "sm"} color={spinnerColorMap[variant] || "default"} />
      ) : (
        renderIcon(icon || leftIcon)
      )}

      {children && <span>{children}</span>}

      {!loading && renderIcon(rightIcon)}
    </button>
  );
});