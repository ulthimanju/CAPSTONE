import { cn } from "@/lib/cn";

import { Icon } from "@/components/ui/Icon";

import { spinnerVariants } from "./Spinner.variants";

/**
 * Generic loading spinner.
 */
export function Spinner({
  size,
  color,
  className,
  ...props
}) {
  return (
    <Icon
      name="loader"
      size={size}
      color={color}
      className={cn(
        spinnerVariants({
          size,
          color,
        }),
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}