import React, { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Avatar primitive with picture_url and fallback to user initials.
 */
export function Avatar({ src, name = '', size = 'md', className }) {
  const [hasError, setHasError] = useState(false);

  const getInitials = (str) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-sep-line bg-sand font-mono font-medium text-text',
        sizeClasses[size] || sizeClasses.md,
        className
      )}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={name || 'User avatar'}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

export default Avatar;
