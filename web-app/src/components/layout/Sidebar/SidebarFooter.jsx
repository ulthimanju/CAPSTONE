import { cn } from "@/lib/cn";
import { Avatar, Typography } from "@/components/ui";
import { useSidebar } from "./Sidebar";
import { sidebarFooterVariants } from "./Sidebar.variants";

export function SidebarFooter({
  user,
  actions,
  className,
  children,
  ...props
}) {
  const { collapsed } = useSidebar();

  // If user object is provided, render a user profile slot
  if (user) {
    return (
      <footer
        className={cn(sidebarFooterVariants(), className)}
        {...props}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}
        >
          <Avatar
            src={user.avatar}
            initials={user.initials}
            size="sm"
            className="shrink-0"
          />

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <Typography
                variant="body-small"
                weight="medium"
                className="truncate text-[var(--color-text-primary)]"
              >
                {user.name}
              </Typography>

              {user.email && (
                <Typography
                  variant="caption"
                  className="truncate text-[var(--color-text-muted)]"
                >
                  {user.email}
                </Typography>
              )}
            </div>
          )}

          {!collapsed && actions && (
            <div className="shrink-0">
              {actions}
            </div>
          )}
        </div>
      </footer>
    );
  }

  // Generic footer slot
  return (
    <footer
      className={cn(sidebarFooterVariants(), className)}
      {...props}
    >
      {children}
    </footer>
  );
}
