import { cva } from 'class-variance-authority';

export const sidebarVariants = cva(
  [
    'flex',
    'flex-col',
    'h-screen',
    'shrink-0',

    'border-r',
    'border-[var(--color-border)]',

    'bg-[var(--color-bg)]',

    'transition-[width]',
    'duration-300',
    'ease-in-out',
  ],
  {
    variants: {
      collapsed: {
        true: 'w-[72px]',

        false: 'w-[288px]',
      },
    },

    defaultVariants: {
      collapsed: false,
    },
  },
);

export const sidebarHeaderVariants = cva([
  'flex',
  'items-center',
  'justify-between',

  'border-b',
  'border-[var(--color-border)]',

  'px-4',
  'py-4',
]);

export const sidebarContentVariants = cva([
  'flex-1',

  'overflow-y-auto',

  'px-2',
  'py-4',

  'space-y-6',
]);

export const sidebarSectionVariants = cva(['space-y-2']);

export const sidebarSectionTitleVariants = cva([
  'px-2',

  'text-xs',

  'font-semibold',

  'uppercase',

  'tracking-wide',

  'text-[var(--color-text-muted)]',
]);

export const sidebarItemVariants = cva(
  [
    'group',

    'flex',
    'items-center',

    'gap-3',

    'w-full',

    'rounded-[var(--radius-sm)]',

    'px-3',
    'py-2.5',

    'text-sm',

    'transition-colors',

    'cursor-pointer',

    'select-none',

    'focus-visible:outline-none',

    'focus-visible:ring-2',

    'focus-visible:ring-[var(--color-primary)]/20',
  ],
  {
    variants: {
      active: {
        true: 'bg-[var(--color-primary)] text-black',

        false:
          'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]',
      },

      collapsed: {
        true: 'justify-center px-0',

        false: '',
      },

      disabled: {
        true: 'pointer-events-none opacity-50',

        false: '',
      },
    },

    defaultVariants: {
      active: false,

      collapsed: false,

      disabled: false,
    },
  },
);

export const sidebarFooterVariants = cva([
  'border-t',

  'border-[var(--color-border)]',

  'p-3',
]);
