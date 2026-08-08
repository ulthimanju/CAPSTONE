import { cn } from "@/lib/cn";

import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { Typography } from "@/components/ui/Typography";

import { buttonVariants } from "./Button.variants";

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

  ...props
}) {
  const contentSize = contentSizeMap[size];

  const spinnerColor = spinnerColorMap[variant];

  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          variant,
          size,
          fullWidth,
        }),
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Spinner
          size={contentSize}
          color={spinnerColor}
        />
      ) : (
        leftIcon && (
          <Icon
            name={leftIcon}
            size={contentSize}
          />
        )
      )}

      <Typography
        as="span"
        variant="button"
        weight="medium"
        color="inherit"
      >
        {children}
      </Typography>

      {!loading && rightIcon && (
        <Icon
          name={rightIcon}
          size={contentSize}
        />
      )}
    </button>
  );
}