import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { SSEProvider } from './providers/SSEProvider';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  useEffect(() => {
    const cleanupMermaidErrors = () => {
      document
        .querySelectorAll('body > div[id^="dmermaid-"]')
        .forEach((div) => {
          div.remove();
        });
    };

    cleanupMermaidErrors();

    const observer = new MutationObserver(() => {
      cleanupMermaidErrors();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <SSEProvider>
          <AppRoutes />
        </SSEProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}