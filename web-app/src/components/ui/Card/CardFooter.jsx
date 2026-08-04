import { cn } from "@/lib/cn";

const FOOTER_LAYOUT = {
  container: "flex items-center justify-end gap-3",
  padding: "px-6 pt-4 pb-6",
};

/**
 * Card footer.
 */
export function CardFooter({
  children,
  className,
  ...props
}) {
  return (
    <footer
      className={cn(
        FOOTER_LAYOUT.container,
        FOOTER_LAYOUT.padding,
        className
      )}
      {...props}
    >
      {children}
    </footer>
  );
}