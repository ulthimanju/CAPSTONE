import { cn } from "@/lib/cn";

import { navbarItemVariants } from "./Navbar.variants";

export function NavbarItem({
  children,

  className,

  ...props
}) {
  return (
    <div
      className={cn(
        navbarItemVariants(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}