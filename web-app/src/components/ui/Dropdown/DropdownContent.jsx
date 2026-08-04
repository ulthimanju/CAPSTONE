import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";
import {
  dropdownContentVariants,
  dropdownLabelVariants,
  dropdownSeparatorVariants,
} from "./Dropdown.variants";

export function DropdownContent({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  collisionPadding = 8,
  className,
  children,
  ...props
}) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(dropdownContentVariants(), "p-1", className)}
        {...props}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function DropdownLabel({ className, children, ...props }) {
  return (
    <DropdownMenu.Label
      className={cn(dropdownLabelVariants(), className)}
      {...props}
    >
      {children}
    </DropdownMenu.Label>
  );
}

export function DropdownSeparator({ className, ...props }) {
  return (
    <DropdownMenu.Separator
      className={cn(dropdownSeparatorVariants(), className)}
      {...props}
    />
  );
}