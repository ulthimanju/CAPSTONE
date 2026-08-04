import { forwardRef } from "react";

import { cn } from "@/lib/cn";

import {
  Badge,
  Icon,
  Typography,
} from "@/components/ui";

import { useSidebar } from "./Sidebar";

import { sidebarItemVariants } from "./Sidebar.variants";

const SIDEBAR_ITEM_LAYOUT = {
  icon: "shrink-0",

  content: "flex min-w-0 flex-1 items-center justify-between gap-2",

  label: "truncate",

  badge: "shrink-0",
};

export const SidebarItem = forwardRef(function SidebarItem(
  {
    icon,

    label,

    badge,

    active = false,

    disabled = false,

    onClick,

    href,

    className,

    children,

    ...props
  },
  ref
) {
  const { collapsed } = useSidebar();

  const content = (
    <>
      {icon && (
        <Icon
          name={icon}
          size="sm"
          color={active ? "default" : "muted"}
          className={SIDEBAR_ITEM_LAYOUT.icon}
        />
      )}

      {!collapsed && (
        <div className={SIDEBAR_ITEM_LAYOUT.content}>
          <Typography
            variant="body-small"
            weight={active ? "medium" : "regular"}
            className={SIDEBAR_ITEM_LAYOUT.label}
          >
            {label}
          </Typography>

          {badge != null && (
            <Badge
              size="sm"
              variant="secondary"
              className={SIDEBAR_ITEM_LAYOUT.badge}
            >
              {badge}
            </Badge>
          )}

          {children}
        </div>
      )}
    </>
  );

  const classes = cn(
    sidebarItemVariants({
      active,
      collapsed,
      disabled,
    }),
    className
  );

  if (href) {
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        aria-current={active ? "page" : undefined}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={classes}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      {content}
    </button>
  );
});