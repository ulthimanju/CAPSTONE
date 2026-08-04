import { cn } from "@/lib/cn";

import { typographyVariants } from "./Typography.variants";

/**
 * Generic typography component.
 *
 * @param {Object} props
 * @param {"display"|"h1"|"h2"|"h3"|"title"|"body"|"body-small"|"label"|"caption"|"button"|"mono"} [props.variant]
 * @param {"regular"|"medium"|"semibold"|"bold"} [props.weight]
 * @param {"default"|"muted"|"disabled"|"primary"|"success"|"danger"} [props.color]
 * @param {"left"|"center"|"right"} [props.align]
 * @param {boolean} [props.truncate]
 * @param {React.ElementType} [props.as]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Typography({
  as: Component = "p",

  variant,
  weight,
  color,
  align,
  truncate,

  className,

  children,

  ...props
}) {
  return (
    <Component
      className={cn(
        typographyVariants({
          variant,
          weight,
          color,
          align,
          truncate,
        }),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}