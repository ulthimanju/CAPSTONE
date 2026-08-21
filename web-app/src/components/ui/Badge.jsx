import React from 'react';
import { cn } from '@/lib/cn';

export function Badge({ children, variant = 'default', className, ...props }) {
  const variantStyles = {
    default: 'bg-surface-raised text-text border border-sep-line',
    technical: 'bg-sand text-text font-mono border border-sep-line',
    nonTechnical: 'bg-surface-raised text-text/80 border border-sep-line',
    role: 'bg-accent/10 text-accent font-mono border border-accent/25',
    success: 'bg-sage-light/25 text-sage-text border-sage/30 font-mono font-semibold',
    warning: 'bg-accent/15 text-accent border-accent/30 font-mono font-semibold',
    danger: 'bg-danger-tint text-danger border-danger/30 font-mono font-semibold',
    outline: 'bg-transparent text-text/80 border border-sep-line font-mono',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-ui px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors',
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
