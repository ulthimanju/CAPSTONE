import React from 'react';
import { CircleNotch } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const variantStyles = {
  primary: 'bg-accent text-on-accent hover:opacity-90 active:scale-[0.99] shadow-theme focus-visible:ring-accent',
  outline: 'border border-sep-line bg-surface-raised text-text hover:bg-surface-hover hover:text-text focus-visible:ring-accent',
  danger: 'border border-danger/40 bg-danger-tint text-danger hover:bg-danger hover:text-white active:bg-danger/90 focus-visible:ring-danger',
  ghost: 'text-text/70 hover:bg-surface-hover hover:text-text focus-visible:ring-accent',
};

/**
 * Production-ready Button primitive with Field Journal variants.
 */
export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = 'primary',
      disabled = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const selectedVariantClass = variantStyles[variant] || variantStyles.primary;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-ui px-4 py-2 text-sm font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:pointer-events-none disabled:opacity-50',
          selectedVariantClass,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <CircleNotch className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
