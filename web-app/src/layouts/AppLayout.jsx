import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const AppLayout = ({ children }) => {

  const { user, logout } = useAuth();
  const path = window.location.pathname;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#090a0f', color: '#e4e4e7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left Sidebar Navigation */}
      <aside style={{ width: '240px', backgroundColor: '#060709', borderRight: '1px solid #16181d', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem 1rem', flexShrink: 0 }}>
        <div>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '800', fontSize: '0.9rem' }}>
              S
            </div>
            <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '0.05em', color: '#ffffff' }}>
              SYNAPSE
            </span>
          </div>

          {/* Section Heading */}
          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#4b5563', letterSpacing: '0.08em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            WORKSPACE
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <a
              href="/workspaces"
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: path.startsWith('/workspaces') ? '#12141a' : 'transparent',
                color: path.startsWith('/workspaces') ? '#ffffff' : '#9ca3af',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: path.startsWith('/workspaces') ? '600' : '400',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: path.startsWith('/workspaces') ? '#10b981' : '#6b7280' }}>📑</span>
                <span>Documents</span>
              </div>
            </a>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert('AI Summary feature coming soon!'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                color: '#9ca3af',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ color: '#6b7280' }}>✨</span>
              <span>AI summary</span>
            </a>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert('Learning path feature coming soon!'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                color: '#9ca3af',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>🌿</span>
                <span>Learning path</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>45</span>
            </a>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert('RAG Assistant feature active in search API!'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                color: '#9ca3af',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ color: '#6b7280' }}>💬</span>
              <span>RAG assistant</span>
            </a>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert('Collaborators management coming soon!'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                color: '#9ca3af',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>👥</span>
                <span>Collaborators</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>1</span>
            </a>
          </nav>
        </div>

        {/* User Account Footer */}
        {user && (
          <div style={{ pt: '1rem', borderTop: '1px solid #16181d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa' }}>
                {user.email ? user.email.substring(0, 2).toUpperCase() : 'UM'}
              </div>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: '500' }}>Account</span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', borderRadius: '4px' }}
            >
              ↪
            </button>
          </div>
        )}
      </aside>

      {/* Main Workspace Workspace Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
};


