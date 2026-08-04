import { cn } from "@/lib/cn";

const CONTENT_LAYOUT = {
  padding: "px-6 pb-6",
  spacing: "space-y-4",
};

/**
 * Card content.
 */
export function CardContent({
  children,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        CONTENT_LAYOUT.padding,
        CONTENT_LAYOUT.spacing,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}