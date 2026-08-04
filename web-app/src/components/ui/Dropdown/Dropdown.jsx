import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function Dropdown({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  modal = true,
  children,
  ...props
}) {
  return (
    <DropdownMenu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
      {...props}
    >
      {trigger && (
        <DropdownMenu.Trigger asChild>
          {trigger}
        </DropdownMenu.Trigger>
      )}
      {children}
    </DropdownMenu.Root>
  );
}

export const DropdownTrigger = DropdownMenu.Trigger;