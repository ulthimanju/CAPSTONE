import { Fragment } from "react";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

import {
  Icon,
  Typography,
} from "@/components/ui";

import {
  breadcrumbItemVariants,
  breadcrumbSeparatorVariants,
  breadcrumbVariants,
} from "./Breadcrumb.variants";

export function Breadcrumb({
  items = [],

  separator,

  className,
}) {
  if (!items.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        breadcrumbVariants(),
        className
      )}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast =
            index === items.length - 1;

          return (
            <Fragment key={item.href ?? item.label}>
              <li
                className={breadcrumbItemVariants({
                  current: isLast,
                })}
              >
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-2"
                  >
                    {item.icon && (
                      <Icon
                        name={item.icon}
                        size="xs"
                        color="muted"
                      />
                    )}

                    <Typography
                      variant="body-small"
                      truncate
                    >
                      {item.label}
                    </Typography>
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-2">
                    {item.icon && (
                      <Icon
                        name={item.icon}
                        size="xs"
                        color={
                          isLast
                            ? "default"
                            : "muted"
                        }
                      />
                    )}

                    <Typography
                      variant="body-small"
                      weight={
                        isLast
                          ? "medium"
                          : "regular"
                      }
                      color={
                        isLast
                          ? "default"
                          : "muted"
                      }
                      truncate
                    >
                      {item.label}
                    </Typography>
                  </div>
                )}
              </li>

              {!isLast && (
                <li
                  aria-hidden="true"
                  className={breadcrumbSeparatorVariants()}
                >
                  {separator ?? (
                    <ChevronRight size={14} />
                  )}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}