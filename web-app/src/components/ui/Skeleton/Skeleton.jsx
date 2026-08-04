import { cn } from "@/lib/cn";

import {
  skeletonVariants,
  skeletonWaveVariants,
} from "./Skeleton.variants";

export function Skeleton({
  width = "100%",

  height = 16,

  shape = "rounded",

  animation = "wave",

  className,

  style,

  ...props
}) {
  return (
    <div
      className={cn(
        skeletonVariants({
          shape,
          animation,
        }),
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {animation === "wave" && (
        <div
          className={skeletonWaveVariants()}
        />
      )}
    </div>
  );
}