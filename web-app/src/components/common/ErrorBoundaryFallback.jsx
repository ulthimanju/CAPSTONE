import React from 'react';

export function ErrorBoundaryFallback({ error, resetErrorBoundary }) {
  return (
    <div
      role="alert"
      className="m-4 flex flex-col items-start gap-3 rounded-ui border border-danger/40 bg-danger-tint p-4 text-danger font-body"
    >
      <div className="flex items-center gap-2">
        <span className="font-display font-bold text-base text-danger">
          Something went wrong
        </span>
      </div>
      {error?.message && (
        <pre className="overflow-x-auto rounded-ui bg-surface-raised p-2 font-mono text-xs text-text border border-sep-line w-full">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="rounded-ui bg-accent px-4 py-1.5 font-body text-sm font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Try again
      </button>
    </div>
  );
}

export default ErrorBoundaryFallback;
