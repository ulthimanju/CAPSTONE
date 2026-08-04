import { cn } from "@/lib/cn";

import {
  Breadcrumb,
  Typography,
} from "@/components/ui";

import {
  pageHeaderActionsVariants,
  pageHeaderBreadcrumbVariants,
  pageHeaderContentVariants,
  pageHeaderVariants,
} from "./PageHeader.variants";

export function PageHeader({
  breadcrumb,

  title,

  description,

  children,

  className,

  ...props
}) {
  return (
    <header
      className={cn(
        pageHeaderVariants(),
        className
      )}
      {...props}
    >
      <div
        className={pageHeaderContentVariants()}
      >
        {breadcrumb && (
          <div
            className={pageHeaderBreadcrumbVariants()}
          >
            <Breadcrumb
              items={breadcrumb}
            />
          </div>
        )}

        <Typography
          variant="h2"
          weight="bold"
        >
          {title}
        </Typography>

        {description && (
          <Typography
            variant="body"
            color="muted"
          >
            {description}
          </Typography>
        )}
      </div>

      {children && (
        <div
          className={pageHeaderActionsVariants()}
        >
          {children}
        </div>
      )}
    </header>
  );
}