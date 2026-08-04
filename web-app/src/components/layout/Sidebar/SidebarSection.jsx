import { cn } from "@/lib/cn";

import { Typography } from "@/components/ui";

import { useSidebar } from "./Sidebar";

import {
  sidebarSectionVariants,
  sidebarSectionTitleVariants,
} from "./Sidebar.variants";

export function SidebarSection({
  title,

  children,

  className,

  ...props
}) {
  const { collapsed } = useSidebar();

  return (
    <section
      className={cn(
        sidebarSectionVariants(),
        className
      )}
      {...props}
    >
      {!collapsed && title && (
        <Typography
          as="h2"
          variant="caption"
          weight="semibold"
          className={sidebarSectionTitleVariants()}
        >
          {title}
        </Typography>
      )}

      <div className="space-y-1">
        {children}
      </div>
    </section>
  );
}