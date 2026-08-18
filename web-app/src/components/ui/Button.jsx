import React from 'react';
import { CircleNotch } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const variantStyles = {
  primary: 'bg-accent bg-gradient-to-br from-[#E08850] to-[#C1622D] text-on-accent hover:from-[#E89860] hover:to-[#C96C35] active:scale-[0.99] focus-visible:ring-accent',
  secondary: 'bg-gradient-to-br from-[#A3B598] to-[#7A8B6F] text-white hover:from-[#B0C1A6] hover:to-[#87997C] active:scale-[0.99] focus-visible:ring-sage',
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
          'disabled:pointer-events-none disabled:opacity-50 disabled:bg-sand disabled:text-text/40',
          selectedVariantClass,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <CircleNotch className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
        )}
        {typeof children === 'string' || typeof children === 'number' ? (
          <span>{children}</span>
        ) : (
          <span className="inline-flex items-center gap-2">{children}</span>
        )}
        {!isLoading && rightIcon && <span className="shrink-0 inline-flex items-center">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
