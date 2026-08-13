import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api/client';
import { useAuth } from '../hooks/useAuth';

export const AppLayout = ({
  children,
  activeTab = 'summary',
  setActiveTab,
  workspaceId = null,
  workspaceName = null,
  docCount = 0,
  workspaces = [],
  onSelectWorkspace,
  onRenameWorkspace,
  onArchiveWorkspace,
  onDeleteWorkspace,
  onCreateWorkspace,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Dark Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Workspace Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [workspacesList, setWorkspacesList] = useState(workspaces || []);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.setAttribute('data-theme', 'dark');
    } else {
      htmlElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      setWorkspacesList(workspaces);
    }
  }, [workspaces]);

  useEffect(() => {
    if (workspaces && workspaces.length > 0) return;

    const fetchWorkspaces = async () => {
      try {
        const headers = {};
        if (user?.id) headers['X-User-ID'] = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;
        const res = await apiClient.get('/api/v1/workspaces', { headers });
        if (res.data && res.data.workspaces) {
          setWorkspacesList(res.data.workspaces);
        } else if (Array.isArray(res.data)) {
          setWorkspacesList(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch workspaces in AppLayout:', err);
      }
    };

    if (user) {
      fetchWorkspaces();
    }
  }, [user, workspaces]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'JS';

  const handleNavClick = (tabKey) => {
    if (tabKey === 'invitations') {
      navigate('/invitations');
      return;
    }

    if (tabKey === 'archived') {
      navigate('/workspaces?tab=archived');
      if (setActiveTab) setActiveTab('archived');
      return;
    }

    const currentWsId = workspaceId || (workspacesList.length > 0 ? workspacesList[0].id : null);
    const path = currentWsId ? `/workspaces/${currentWsId}` : '/workspaces';
    const query = tabKey === 'documents' ? '' : `?tab=${tabKey}`;

    navigate(`${path}${query}`);
    if (setActiveTab) setActiveTab(tabKey);
  };

  return (
    <div className="shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          Synapse<span>.</span>
        </div>

        {/* Styled Dropdown Below App Title */}
        <div className="workspace-dropdown-container" ref={dropdownRef}>
          <button
            className="workspace-select-btn"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            <div className="workspace-select-left">
              <svg viewBox="0 0 24 24">
                <path d="M10 2v7.31L5.5 18.5A2 2 0 0 0 7.28 21h9.44a2 2 0 0 0 1.78-2.5L14 9.31V2h-4z"></path>
                <line x1="8.5" y1="12" x2="15.5" y2="12"></line>
              </svg>
              <span>{workspaceName || 'AI research lab'}</span>
            </div>
            <svg
              className="chevron"
              viewBox="0 0 24 24"
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div className={`dropdown-menu ${isDropdownOpen ? 'open' : ''}`}>
            {workspacesList.length === 0 ? (
              <div className="dropdown-item" style={{ color: 'var(--color-text-disabled)' }}>
                No active workspaces found
              </div>
            ) : (
              workspacesList.map((ws) => (
                <div
                  key={ws.id}
                  className="dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onSelectWorkspace) onSelectWorkspace(ws);
                    else navigate(`/workspaces/${ws.id}`);
                  }}
                >
                  {ws.name}
                </div>
              ))
            )}
            {onCreateWorkspace && (
              <div
                className="dropdown-item"
                style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-primary)', fontWeight: 500 }}
                onClick={() => {
                  setIsDropdownOpen(false);
                  onCreateWorkspace();
                }}
              >
                + Create Workspace
              </div>
            )}
          </div>
        </div>

        <nav className="nav-section">
          <span className="nav-label">Workspace Related</span>
          <button
            className={`nav-item ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => handleNavClick('summary')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            summary
          </button>
          <button
            className={`nav-item ${activeTab === 'learning' ? 'active' : ''}`}
            onClick={() => handleNavClick('learning')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Learning path
          </button>
          <button
            className={`nav-item ${activeTab === 'rag' || activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleNavClick('rag')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Chat
          </button>
          <button
            className={`nav-item ${activeTab === 'collab' ? 'active' : ''}`}
            onClick={() => handleNavClick('collab')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Collaborators
          </button>

          <span className="nav-label">Actions</span>
          <button
            className={`nav-item ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => handleNavClick('invitations')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            Invitations
          </button>

          <span className="nav-label">System</span>
          <button className="nav-item" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            Theme Toggle Button
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info">
            <span className="user-name">
              {user?.name || (user?.email ? user.email.split('@')[0] : 'John Scholar')}
            </span>
            <span className="user-role">Lead Researcher</span>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        <main className="journal-container">{children}</main>
      </div>
    </div>
  );
};
