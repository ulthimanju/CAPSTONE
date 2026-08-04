import { cn } from "@/lib/cn";

import { Typography } from "@/components/ui";

import { badgeVariants } from "./Badge.variants";

/**
 * Generic badge component.
 */
export function Badge({
  children,

  variant = "default",

  size = "md",

  rounded = false,

  className,

  ...props
}) {
  return (
    <span
      className={cn(
        badgeVariants({
          variant,
          size,
          rounded,
        }),
        className
      )}
      {...props}
    >
      <Typography
        as="span"
        variant="caption"
        weight="medium"
        color="inherit"
      >
        {children}
      </Typography>
    </span>
  );
}