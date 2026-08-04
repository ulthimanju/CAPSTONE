import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/cn";

import { tooltipContentVariants } from "./Tooltip.variants";

export function Tooltip({
  children,

  content,

  side = "top",

  align = "center",

  sideOffset = 8,

  delayDuration = 200,

  className,
}) {
  if (!content) {
    return children;
  }

  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
    >
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={cn(
              tooltipContentVariants(),
              className
            )}
          >
            {content}

            <TooltipPrimitive.Arrow
              className="fill-[var(--color-bg-surface)]"
              width={10}
              height={5}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}