import React from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useUploadQueueStore } from '@/store/uploadQueueStore';
import { cn } from '@/lib/cn';

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(ext)) return ImageIcon;
  if (['xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['pptx', 'key'].includes(ext)) return Presentation;
  return FileText;
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function UploadQueueWidget() {
  const items = useUploadQueueStore((state) => state.items);
  const isVisible = useUploadQueueStore((state) => state.isVisible);
  const isExpanded = useUploadQueueStore((state) => state.isExpanded);
  const setExpanded = useUploadQueueStore((state) => state.setExpanded);
  const dismissAll = useUploadQueueStore((state) => state.dismissAll);

  if (!isVisible || items.length === 0) {
    return null;
  }

  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;
  const inProgressCount = items.filter(
    (i) => i.status === 'UPLOADING' || i.status === 'QUEUED' || i.status === 'PROCESSING'
  ).length;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-80 sm:w-96 rounded-ui border border-sep-line bg-surface-raised/95 shadow-theme backdrop-blur transition-all duration-200',
        !isExpanded && 'w-72'
      )}
      role="region"
      aria-label="Upload progress tracker"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-sep-line px-3 py-2.5 bg-sand/60 rounded-t-ui">
        <div className="flex items-center gap-2 min-w-0">
          <UploadCloud className="h-4 w-4 shrink-0 text-accent" />
          <span className="font-display text-xs font-bold text-text truncate">
            {inProgressCount > 0
              ? `Uploading ${items.length - completedCount} file${items.length - completedCount > 1 ? 's' : ''}...`
              : `Uploaded ${completedCount} file${completedCount > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(!isExpanded)}
            className="rounded-ui p-1 text-text/60 hover:bg-surface-hover hover:text-text transition-colors"
            aria-label={isExpanded ? 'Minimize upload list' : 'Expand upload list'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={dismissAll}
            className="rounded-ui p-1 text-text/60 hover:bg-danger-tint hover:text-danger transition-colors"
            aria-label="Close upload manager"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded File Queue List */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto divide-y divide-sep-line/60 p-1">
          {items.map((item) => {
            const Icon = getFileIcon(item.name);

            return (
              <div key={item.id} className="p-2 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="font-mono text-[11px] font-semibold text-text truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="shrink-0 font-mono text-[10px]">
                    {item.status === 'COMPLETED' && (
                      <span className="flex items-center gap-1 text-success font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    )}
                    {item.status === 'UPLOADING' && (
                      <span className="flex items-center gap-1 text-accent">
                        <Loader2 className="h-3 w-3 animate-spin" /> {item.progress}%
                      </span>
                    )}
                    {item.status === 'PROCESSING' && (
                      <span className="flex items-center gap-1 text-accent font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" /> Parsing
                      </span>
                    )}
                    {item.status === 'QUEUED' && (
                      <span className="text-text/50">Queued</span>
                    )}
                    {item.status === 'FAILED' && (
                      <span className="flex items-center gap-1 text-danger font-semibold" title={item.error}>
                        <AlertCircle className="h-3 w-3" /> Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar or error message */}
                {(item.status === 'UPLOADING' || item.status === 'PROCESSING') && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full bg-accent transition-all duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {item.status === 'FAILED' && item.error && (
                  <p className="font-mono text-[10px] text-danger truncate">
                    {item.error}
                  </p>
                )}

                <div className="flex justify-between font-mono text-[10px] text-text/50">
                  <span>{formatBytes(item.size)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UploadQueueWidget;
