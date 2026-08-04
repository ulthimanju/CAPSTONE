import { useCallback } from "react";

import { useDropzone } from "react-dropzone";

import { cn } from "@/lib/cn";

import {
  uploadFileListVariants,
  uploadZoneVariants,
} from "./UploadZone.variants";

import { EmptyState } from "@/common/EmptyState";
import { UploadFileItem } from "./UploadFileItem";

export function UploadZone({
  files = [],

  accept,

  multiple = true,

  maxSize,

  disabled = false,

  onFilesAdded,

  onAction,

  className,
}) {
  const onDrop = useCallback(
    acceptedFiles => {
      if (disabled) {
        return;
      }

      onFilesAdded?.(acceptedFiles);
    },
    [disabled, onFilesAdded]
  );

  const {
    getRootProps,

    getInputProps,

    open,

    isDragActive,
  } = useDropzone({
    onDrop,

    accept,

    multiple,

    maxSize,

    noClick: true,

    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        uploadZoneVariants({
          dragging: isDragActive,
        }),
        className
      )}
    >
      <input {...getInputProps()} />

      <UploadEmptyState
        openFileDialog={open}
      />

      {files.length > 0 && (
        <div
          className={uploadFileListVariants()}
        >
          {files.map(file => (
            <UploadFileItem
              key={file.id}
              file={file}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}