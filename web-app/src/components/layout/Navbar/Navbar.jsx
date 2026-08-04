import { cn } from "@/lib/cn";

import {
  navbarSectionVariants,
  navbarVariants,
} from "./Navbar.variants";

export function Navbar({
  children,

  className,

  ...props
}) {
  return (
    <header
      className={cn(
        navbarVariants(),
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}

export function NavbarSection({
  align = "left",

  children,

  className,

  ...props
}) {
  return (
    <div
      className={cn(
        navbarSectionVariants({
          align,
        }),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}