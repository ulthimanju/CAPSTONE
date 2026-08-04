import { cn } from "@/lib/cn";
import { Button, Typography } from "@/components/ui";
import { useSidebar } from "./Sidebar";
import { sidebarHeaderVariants } from "./Sidebar.variants";

export function SidebarHeader({
  logo,
  title,
  onCollapse,
  collapseIcon = "chevron-down",
  className,
  children,
  ...props
}) {
  const { collapsed } = useSidebar();

  return (
    <header
      className={cn(sidebarHeaderVariants(), className)}
      {...props}
    >
      {/* Logo + Title */}
      {(logo || title) && (
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          {logo && (
            <div className="shrink-0">
              {logo}
            </div>
          )}

          {!collapsed && title && (
            <Typography
              variant="body-small"
              weight="semibold"
              className="truncate text-[var(--color-text-primary)]"
            >
              {title}
            </Typography>
          )}
        </div>
      )}

      {/* Arbitrary children when no logo/title provided */}
      {!logo && !title && children}

      {/* Collapse toggle */}
      {onCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          leftIcon={collapseIcon}
          className={cn(
            "shrink-0 text-[var(--color-text-muted)]",
            collapsed && "[&_svg]:rotate-180"
          )}
        />
      )}
    </header>
  );
}

