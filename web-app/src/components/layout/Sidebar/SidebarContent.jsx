import { cn } from "@/lib/cn";
import { sidebarContentVariants } from "./Sidebar.variants";

export function SidebarContent({
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn(sidebarContentVariants(), className)}
      {...props}
    >
      {children}
    </div>
  );
}
