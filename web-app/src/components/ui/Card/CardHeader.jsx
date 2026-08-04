import { cn } from "@/lib/cn";

const HEADER_LAYOUT = {
  container: "flex items-center justify-between gap-4",
  padding: "px-6 pt-6 pb-4",
};

/**
 * Card header.
 */
export function CardHeader({
  children,
  className,
  ...props
}) {
  return (
    <header
      className={cn(
        HEADER_LAYOUT.container,
        HEADER_LAYOUT.padding,
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}