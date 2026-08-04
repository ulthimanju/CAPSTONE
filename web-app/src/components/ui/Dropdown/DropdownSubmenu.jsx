import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  dropdownContentVariants,
  dropdownItemVariants,
} from "./Dropdown.variants";

export function DropdownSubmenu({
  label,
  icon,
  children,
  className,
  ...props
}) {
  return (
    <DropdownMenu.Sub {...props}>
      <DropdownMenu.SubTrigger
        className={cn(
          dropdownItemVariants({ variant: "default" }),
          "justify-between",
          className
        )}
      >
        <div className="flex items-center gap-3 truncate">
          {icon && <Icon name={icon} size="sm" className="shrink-0" />}
          <span>{label}</span>
        </div>
        <Icon name="chevron-right" size="sm" className="ml-auto shrink-0 opacity-60" />
      </DropdownMenu.SubTrigger>

      <DropdownMenu.Portal>
        <DropdownMenu.SubContent
          className={cn(dropdownContentVariants(), "p-1")}
        >
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}