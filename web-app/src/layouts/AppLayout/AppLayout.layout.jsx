/**
 * AppLayout — Layout Layer
 *
 * Pure structural JSX. Receives all state and handlers as props.
 * Contains zero business logic.
 *
 * Component hierarchy:
 *   AppLayout
 *     Sidebar
 *       Brand
 *       WorkspaceSelector  (native <select>)
 *       Navigation         (data-driven from sidebarConfig)
 *         SidebarSection   (renders a section from config)
 *           SidebarItem    (renders a single nav item or action)
 *       UserSection
 *     MainLayout
 *       MainHeader
 *       MainContent
 */

import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { Selector } from '../../components/ui/Selector';
import { sidebarSections, resolvePath, isItemActive, Sun } from './sidebarConfig';

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
// WorkspaceSelector — using reusable Selector component
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
// SidebarItem — renders one item from the config
// ──────────────────────────────────────────────────────────────────────────────

function SidebarItem({ item, workspaceId, onAction }) {
  const location = useLocation();
  const navigate = useNavigate();
  const themeCtx = useContext(ThemeContext);
  const active   = isItemActive(item, location);

  // For theme toggle: swap icon to show current state
  const Icon = item.action === 'toggle-theme'
    ? (themeCtx?.theme === 'dark' ? Sun : Moon)
    : item.icon;

  // Action items (e.g. theme toggle) — render as button
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

  // Navigation items — render as Link with explicit onClick to guarantee state transition
  const resolvedHref = resolvePath(item, workspaceId) ?? '/workspaces';

  return (
    <Link
      to={resolvedHref}
      onClick={(e) => {
        e.preventDefault();
        navigate(resolvedHref);
      }}
      className={`sidebar-item${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={17} strokeWidth={1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SidebarSection — renders one section from the config
// ──────────────────────────────────────────────────────────────────────────────

function SidebarSection({ section, workspaceId, onAction }) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">{section.label}</div>
      <div className="sidebar-section-items">
        {section.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            workspaceId={workspaceId}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Navigation — maps over sidebarSections config
// ──────────────────────────────────────────────────────────────────────────────

function Navigation({ activeWorkspaceId, onAction }) {
  return (
    <nav className="sidebar-navigation" aria-label="Main navigation">
      {sidebarSections.map((section) => (
        <SidebarSection
          key={section.label}
          section={section}
          workspaceId={activeWorkspaceId}
          onAction={onAction}
        />
      ))}
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// UserSection — Avatar, User Info, Sign Out
// ──────────────────────────────────────────────────────────────────────────────

function UserSection({ initials, name, email, onLogout }) {
  return (
    <div className="sidebar-footer">
      {/* Avatar */}
      <div className="sidebar-footer-avatar" aria-hidden="true">
        {initials}
      </div>

      {/* User info */}
      <div className="sidebar-footer-info">
        <span className="sidebar-footer-name">{name}</span>
        {email && <span className="sidebar-footer-email">{email}</span>}
      </div>

      {/* Sign out */}
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
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--error-subtle)';
          e.currentTarget.style.color = 'var(--error)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        {/* Inline SVG for logout — avoids tabler icon dependency here */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MainHeader — top bar with mobile hamburger and WorkspaceSelector
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
        {/* Inline menu icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6"  x2="21" y2="6"  />
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
// AppLayoutTemplate — root shell
// ──────────────────────────────────────────────────────────────────────────────

export function AppLayoutTemplate({
  // Sidebar state
  isSidebarOpen,
  onCloseSidebar,
  onToggleSidebar,

  // Workspace data
  workspaces,
  activeWorkspace,
  activeWorkspaceId,
  onSelectWorkspace,

  // Actions
  onAction,       // handles any action id from sidebarConfig (e.g. "toggle-theme")
  onGoHome,
  onLogout,

  // User
  userInitials,
  userName,
  userEmail,

  // Content
  children,
  headerSlot,
}) {
  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      )}

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside className={`sidebar${isSidebarOpen ? ' is-open' : ''}`} aria-label="Sidebar">
        <Brand onClick={onGoHome} />

        <Navigation
          activeWorkspaceId={activeWorkspaceId}
          onAction={onAction}
        />

        <UserSection
          initials={userInitials}
          name={userName}
          email={userEmail}
          onLogout={onLogout}
        />
      </aside>

      {/* ═══════════════ MAIN ═══════════════ */}
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
