import { useState } from "react";

import { User } from "lucide-react";

import { cn } from "@/lib/cn";

import {
  avatarImageVariants,
  avatarStatusVariants,
  avatarVariants,
} from "./Avatar.variants";

export function Avatar({
  src,

  alt = "Avatar",

  initials,

  size = "md",

  shape = "circle",

  status,

  className,

  ...props
}) {
  const [imageError, setImageError] = useState(false);

  const showImage = src && !imageError;

  return (
    <div
      className={cn(
        avatarVariants({
          size,
          shape,
        }),
        className
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className={avatarImageVariants()}
          onError={() => setImageError(true)}
        />
      ) : initials ? (
        initials.slice(0, 2).toUpperCase()
      ) : (
        <User size={18} />
      )}

      {status && (
        <span
          className={avatarStatusVariants({
            status,
            size,
          })}
        />
      )}
    </div>
  );
}