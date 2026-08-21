import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/store/authStore';

export function renderWithProviders(ui, { route = '/', queryClient, ...renderOptions } = {}) {
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
      },
    });

  if (!route.startsWith('/auth/callback') && route !== '/login') {
    if (!useAuthStore.getState().token) {
      useAuthStore.getState().setToken('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlNGIzYzJhMS0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEifQ.sig');
    }
    if (!client.getQueryData(['auth', 'profile'])) {
      client.setQueryData(['auth', 'profile'], {
        id: 'e4b3c2a1-0000-4000-8000-000000000001',
        email: 'test.user@synapse.local',
        full_name: 'Test Student',
        role: 'STUDENT',
      });
    }
  }

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { client, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
