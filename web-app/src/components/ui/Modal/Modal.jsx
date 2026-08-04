import * as Dialog from "@radix-ui/react-dialog";

export function Modal({
  open,
  defaultOpen,
  onOpenChange,
  modal = true,
  children,
  ...props
}) {
  return (
    <Dialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
      {...props}
    >
      {children}
    </Dialog.Root>
  );
}

export const ModalTrigger = Dialog.Trigger;
