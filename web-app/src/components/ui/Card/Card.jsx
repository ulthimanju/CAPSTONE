import { cn } from "@/lib/cn";

import { cardVariants } from "./Card.variants";

/**
 * Generic card container.
 *
 * @param {Object} props
 * @param {"default"|"outlined"|"elevated"} [props.variant]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Card({
  children,
  variant = "default",
  className,
  ...props
}) {
  return (
    <section
      className={cn(
        cardVariants({
          variant,
        }),
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}