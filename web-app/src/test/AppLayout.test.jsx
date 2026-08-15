import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { renderWithProviders } from './utils';

describe('AppLayout & Responsive Wireframe Behavior', () => {
  beforeEach(() => {
    useUIStore.setState({ isMobileSidebarOpen: false });
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('renders skip link, sidebar, header, and main content area', () => {
    renderWithProviders(
      <AppLayout
        headerTitle="Dashboard"
        sidebarHeader={<span>Brand Logo</span>}
        sidebarNavigation={<div>Nav Items</div>}
      >
        <div>Main Layout Content</div>
      </AppLayout>
    );

    // Skip to main content link
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();

    // Main header title
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();

    // Main content
    expect(screen.getByText('Main Layout Content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('toggles off-canvas mobile/tablet drawer when hamburger button is clicked', () => {
    renderWithProviders(
      <AppLayout headerTitle="Workspace">
        <div>Content</div>
      </AppLayout>
    );

    const toggleButton = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(useUIStore.getState().isMobileSidebarOpen).toBe(false);

    fireEvent.click(toggleButton);
    expect(useUIStore.getState().isMobileSidebarOpen).toBe(true);

    const drawer = screen.getByRole('dialog', { name: /navigation drawer/i });
    expect(drawer).toHaveClass('translate-x-0');
  });

  it('closes off-canvas drawer when Escape key is pressed', () => {
    useUIStore.setState({ isMobileSidebarOpen: true });

    renderWithProviders(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(useUIStore.getState().isMobileSidebarOpen).toBe(true);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUIStore.getState().isMobileSidebarOpen).toBe(false);
  });
});
