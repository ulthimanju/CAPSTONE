import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Card surface container using Field Journal design tokens.
 */
export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-ui border border-sep-line bg-surface-raised p-6 text-text shadow-theme',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
