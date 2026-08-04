import { cn } from "@/lib/cn";
import { Typography } from "@/components/ui";

import {
  dividerLabelVariants,
  dividerVariants,
} from "./Divider.variants";

const DIVIDER_LAYOUT = {
  horizontal: "flex items-center w-full",

  vertical: "inline-flex h-full",
};

export function Divider({
  label,

  align = "center",

  orientation = "horizontal",

  spacing = "md",

  className,

  ...props
}) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn(
          dividerVariants({
            orientation,
            spacing,
          }),
          className
        )}
        {...props}
      />
    );
  }

  if (!label) {
    return (
      <hr
        className={cn(
          dividerVariants({
            orientation,
            spacing,
          }),
          className
        )}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        DIVIDER_LAYOUT.horizontal,
        dividerVariants({
          spacing,
        }),
        className
      )}
      role="separator"
      aria-orientation="horizontal"
      {...props}
    >
      {(align === "center" || align === "right") && (
        <div className="flex-1 border-t border-[var(--color-border)]" />
      )}

      <Typography
        as="span"
        className={dividerLabelVariants()}
      >
        {label}
      </Typography>

      {(align === "center" || align === "left") && (
        <div className="flex-1 border-t border-[var(--color-border)]" />
      )}
    </div>
  );
}