import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { dropdownItemVariants } from "./Dropdown.variants";

export function DropdownItem({
  icon,
  label,
  shortcut,
  danger = false,
  disabled = false,
  onSelect,
  className,
  children,
  ...props
}) {
  const variant = danger ? "danger" : "default";

  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(dropdownItemVariants({ variant }), className)}
      {...props}
    >
      {icon && <Icon name={icon} size="sm" className="shrink-0" />}
      <span className="flex-1 truncate">{label ?? children}</span>
      {shortcut && (
        <span className="ml-auto text-xs tracking-widest opacity-60">
          {shortcut}
        </span>
      )}
    </DropdownMenu.Item>
  );
}