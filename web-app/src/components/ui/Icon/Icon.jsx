import { cn } from "@/lib/cn";

import { icons } from "./icons";
import { iconVariants } from "./Icon.variants";

const strokeWidths = {
  thin: 1.5,
  default: 2,
  bold: 2.5,
};

export function Icon({
  name,
  size,
  color,
  stroke,
  className,
  ...props
}) {
  const LucideIcon = icons[name] ?? null;
  if (!LucideIcon) return null;

  return (
    <LucideIcon
      strokeWidth={strokeWidths[stroke ?? "default"]}
      className={cn(
        iconVariants({
          size,
          color,
          stroke,
        }),
        className
      )}
      {...props}
    />
  );
}