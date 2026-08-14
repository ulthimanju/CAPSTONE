/**
 * AppLayout — Layout Layer
 *
 * Clean, production-level, responsive layout template.
 */

import React, { useContext } from 'react';
import { Moon } from 'lucide-react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { Selector } from '../../components/ui/Selector';
import { SIDEBAR_CONFIG, Sun } from './sidebarConfig';

// ──────────────────────────────────────────────────────────────────────────────
// Brand
// ──────────────────────────────────────────────────────────────────────────────

function Brand({ onClick }) {
  return (
    <button
      type="button"
      className="sidebar-brand"
      onClick={onClick}
      aria-label="Go to workspaces"
    >
      Synapse<span className="sidebar-brand-dot">.</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// WorkspaceSelector
// ──────────────────────────────────────────────────────────────────────────────

function WorkspaceSelector({ workspaces, activeWorkspaceId, onSelect }) {
  if (!workspaces.length) return null;

  const options = workspaces.map((ws) => ({
    value: ws.id,
    label: ws.name,
  }));

  return (
    <Selector
      value={activeWorkspaceId ?? ''}
      options={options}
      placeholder="Select workspace…"
      onChange={(selectedId) => {
        const ws = workspaces.find((w) => w.id === selectedId);
        if (ws) onSelect(ws);
      }}
      aria-label="Select workspace"
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SidebarItem
// ──────────────────────────────────────────────────────────────────────────────

function SidebarItem({ item, activeTab, onSelectTab, onAction }) {
  const themeCtx = useContext(ThemeContext);
  const isActive = item.tab ? activeTab === item.tab : false;

  const Icon = item.action === 'toggle-theme'
    ? (themeCtx?.theme === 'dark' ? Sun : Moon)
    : item.icon;

  if (item.action) {
    return (
      <button
        type="button"
        className="sidebar-item"
        onClick={() => onAction(item.action)}
        aria-label={
          item.action === 'toggle-theme'
            ? (themeCtx?.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
            : item.label
        }
      >
        <Icon size={17} strokeWidth={1.8} />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectTab(item.tab)}
      className={`sidebar-item${isActive ? ' is-active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: isActive ? 'var(--bg-raised)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-soft)',
        fontWeight: isActive ? 'var(--weight-semibold)' : 'normal',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={17} strokeWidth={1.8} />
      <span>{item.label}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SidebarSection
// ──────────────────────────────────────────────────────────────────────────────

function SidebarSection({ section, activeTab, onSelectTab, onAction }) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">{section.label}</div>
      <div className="sidebar-section-items">
        {section.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────────────────────────────────────

function Navigation({ activeTab, onSelectTab, onAction }) {
  return (
    <nav className="sidebar-navigation" aria-label="Main navigation">
      {SIDEBAR_CONFIG.map((section) => (
        <SidebarSection
          key={section.label}
          section={section}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onAction={onAction}
        />
      ))}
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// UserSection
// ──────────────────────────────────────────────────────────────────────────────

function UserSection({ initials, name, email, onLogout }) {
  return (
    <div className="sidebar-footer">
      <div className="sidebar-footer-avatar" aria-hidden="true">
        {initials}
      </div>

      <div className="sidebar-footer-info">
        <span className="sidebar-footer-name">{name}</span>
        {email && <span className="sidebar-footer-email">{email}</span>}
      </div>

      <button
        type="button"
        onClick={onLogout}
        title="Sign out"
        aria-label="Sign out"
        style={{
          background: 'none',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 7px',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          transition: 'color 150ms ease, background-color 150ms ease',
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MainHeader
// ──────────────────────────────────────────────────────────────────────────────

function MainHeader({
  onToggleSidebar,
  headerSlot,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
}) {
  return (
    <header className="main-header" aria-label="App header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <button
        type="button"
        className="hamburger-btn"
        onClick={onToggleSidebar}
        aria-label="Open navigation"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div style={{ width: '280px', flexShrink: 0 }}>
        <WorkspaceSelector
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelect={onSelectWorkspace}
        />
      </div>

      {headerSlot && (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {headerSlot}
        </div>
      )}
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AppLayoutTemplate
// ──────────────────────────────────────────────────────────────────────────────

export function AppLayoutTemplate({
  isSidebarOpen,
  onCloseSidebar,
  onToggleSidebar,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  activeTab,
  onSelectTab,
  onAction,
  onGoHome,
  onLogout,
  userInitials,
  userName,
  userEmail,
  children,
  headerSlot,
}) {
  return (
    <div className="app-layout">
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${isSidebarOpen ? ' is-open' : ''}`} aria-label="Sidebar">
        <Brand onClick={onGoHome} />

        <Navigation
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onAction={onAction}
        />

        <UserSection
          initials={userInitials}
          name={userName}
          email={userEmail}
          onLogout={onLogout}
        />
      </aside>

      <div className="main-layout">
        <MainHeader
          onToggleSidebar={onToggleSidebar}
          headerSlot={headerSlot}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={onSelectWorkspace}
        />

        <main className="main-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
