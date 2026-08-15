import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'sonner';
import * as Sentry from '@sentry/react';

import App from './App';
import './index.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="p-4 m-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
      <p className="font-semibold">Something went wrong:</p>
      <pre className="text-sm mt-1">{error?.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="mt-3 px-4 py-1.5 bg-primary text-primary-foreground text-sm rounded-md"
      >
        Try again
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
