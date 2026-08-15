import React from 'react';
import { cn } from '@/lib/cn';

export const Input = React.forwardRef(({ className, type = 'text', error, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-ui border border-sep-line bg-bg px-3 py-2 text-sm font-body text-text shadow-theme placeholder:text-text/40 transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-danger focus-visible:border-danger focus-visible:ring-danger',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
