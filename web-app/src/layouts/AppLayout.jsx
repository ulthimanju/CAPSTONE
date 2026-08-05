import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg, #0a0a0b)', color: 'var(--color-text-primary, #e4e4e7)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: 'var(--color-bg-surface, #16161a)', borderBottom: '1px solid var(--color-border, #1f1f22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary, #e4e4e7)' }}>AI Learning Platform</h2>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="/workspaces" style={{ color: 'var(--color-text-secondary, #a1a1aa)', textDecoration: 'none', fontWeight: '500', transition: 'color 0.2s' }}>Workspaces</a>
            <a href="/profile" style={{ color: 'var(--color-text-secondary, #a1a1aa)', textDecoration: 'none', fontWeight: '500', transition: 'color 0.2s' }}>Profile</a>
          </nav>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary, #a1a1aa)' }}>{user.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
};

