import { Fragment } from "react";

import { cn } from "@/lib/cn";

import {
  Button,
  Icon,
  Typography,
} from "@/components/ui";

import {
  paginationButtonVariants,
  paginationListVariants,
  paginationVariants,
} from "./Pagination.variants";

function getPages(page, totalPages) {
  const pages = [];

  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, i) => i + 1
    );
  }

  pages.push(1);

  if (page > 3) {
    pages.push("...");
  }

  const start = Math.max(2, page - 1);

  const end = Math.min(
    totalPages - 1,
    page + 1
  );

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (page < totalPages - 2) {
    pages.push("...");
  }

  pages.push(totalPages);

  return pages;
}

export function Pagination({
  page,

  totalPages,

  totalItems,

  pageSize,

  onPageChange,

  className,
}) {
  const pages = getPages(
    page,
    totalPages
  );

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        paginationVariants(),
        className
      )}
    >
      <div>
        {totalItems && pageSize && (
          <Typography
            variant="caption"
            color="muted"
          >
            Showing{" "}
            {(page - 1) * pageSize + 1}
            –
            {Math.min(
              page * pageSize,
              totalItems
            )}{" "}
            of {totalItems}
          </Typography>
        )}
      </div>

      <div
        className={paginationListVariants()}
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={page === 1}
          onClick={() =>
            onPageChange(page - 1)
          }
        >
          <Icon
            name="chevronLeft"
            size="xs"
          />
        </Button>

        {pages.map((item, index) => (
          <Fragment key={index}>
            {item === "..." ? (
              <Typography
                variant="body-small"
                color="muted"
              >
                ...
              </Typography>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onPageChange(item)
                }
                className={paginationButtonVariants(
                  {
                    active:
                      item === page,
                  }
                )}
              >
                {item}
              </button>
            )}
          </Fragment>
        ))}

        <Button
          variant="ghost"
          size="sm"
          disabled={
            page === totalPages
          }
          onClick={() =>
            onPageChange(page + 1)
          }
        >
          <Icon
            name="chevronRight"
            size="xs"
          />
        </Button>
      </div>
    </nav>
  );
}