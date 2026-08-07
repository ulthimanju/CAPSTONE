import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { SSEProvider } from './providers/SSEProvider';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
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