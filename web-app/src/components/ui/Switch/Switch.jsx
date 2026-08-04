import { forwardRef, useId } from 'react';

import { cn } from '@/lib/cn';
import { Typography } from '@/components/ui';

import { switchTrackVariants, switchThumbVariants } from './Switch.variants';

const SWITCH_LAYOUT = {
  wrapper: 'flex flex-col gap-2',

  row: 'flex items-start gap-4',
  content: 'flex-1 flex flex-col gap-1',
};

export const Switch = forwardRef(function Switch(
  {
    id,

    label,

    helperText,

    error,

    checked = false,

    onCheckedChange,

    size = 'md',

    disabled = false,

    required = false,

    className,

    ...props
  },
  ref,
) {
  const generatedId = useId();

  const switchId = id ?? generatedId;

  const helperId = `${switchId}-helper`;

  const errorId = `${switchId}-error`;

  return (
    <div className={SWITCH_LAYOUT.wrapper}>
      <div className={SWITCH_LAYOUT.row}>
        <div className={SWITCH_LAYOUT.content}>
          {label && (
            <Typography
              as="label"
              htmlFor={switchId}
              variant="body-small"
              weight="medium"
            >
              {label}

              {required && (
                <Typography as="span" color="danger">
                  {' *'}
                </Typography>
              )}
            </Typography>
          )}

          {error ? (
            <Typography id={errorId} variant="caption" color="danger">
              {error}
            </Typography>
          ) : (
            helperText && (
              <Typography id={helperId} variant="caption" color="muted">
                {helperText}
              </Typography>
            )
          )}
        </div>

        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onCheckedChange?.(!checked);
            }
          }}
          onKeyDown={(event) => {
            if (disabled) return;

            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();

              onCheckedChange?.(!checked);
            }
          }}
          aria-required={required}
          aria-disabled={disabled}
          className={cn(
            switchTrackVariants({
              size,
              checked,
              hasError: Boolean(error),
            }),

            !disabled && 'hover:brightness-105',

            className,
          )}
          {...props}
        >
          <span
            className={switchThumbVariants({
              size,
              checked,
            })}
          />
        </button>
      </div>
    </div>
  );
});
