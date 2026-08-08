import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { SSEProvider } from './providers/SSEProvider';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  useEffect(() => {
    const cleanupStrayNodes = () => {
      document
        .querySelectorAll(
          'body > svg[id^="mermaid-"], body > svg[aria-roledescription="error"], body > div[id^="dmermaid-"], body > svg[id^="dmermaid-"]'
        )
        .forEach((el) => el.remove());
    };

    cleanupStrayNodes();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (
            node.nodeType === 1 &&
            ((node.tagName === 'SVG' && /^d?mermaid-/i.test(node.id || '')) ||
              node.getAttribute?.('aria-roledescription') === 'error' ||
              node.classList?.contains('error-icon') ||
              /^dmermaid-/i.test(node.id || ''))
          ) {
            node.remove();
          }
        });
      });
    });

    observer.observe(document.body, { childList: true });

    return () => observer.disconnect();
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