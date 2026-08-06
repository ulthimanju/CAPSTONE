import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

export const AppLayout = ({
  children,
  activeTab = 'documents',
  setActiveTab,
  workspaceName = 'Software Engineering',
  docCount = 0,
  readyCount = 0,
  processingCount = 0,
  workspaces = [],
  onSelectWorkspace,
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
    const fetchWorkspaces = async () => {
      try {
        const headers = {};
        if (user?.id) headers['X-User-ID'] = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;
        const res = await axios.get('/api/v1/workspaces', { headers });
        if (res.data && res.data.workspaces) {
          setWorkspacesList(res.data.workspaces);
        }
      } catch (err) {
        console.error('Failed to fetch workspaces in AppLayout:', err);
      }
    };

    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  // Click outside listener for dropdown
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

  const getTabTitle = () => {
    switch (activeTab) {
      case 'summary':
        return 'AI Summary';
      case 'learning':
        return 'Learning Path';
      case 'rag':
        return 'RAG Assistant';
      case 'collab':
        return 'Collaborators';
      case 'invitations':
        return 'Invitations';
      case 'archived':
        return 'Archived Workspaces';
      default:
        return 'Documents';
    }
  };

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'UM';

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

    const currentWsId = workspacesList.length > 0 ? workspacesList[0].id : null;
    const path = currentWsId ? `/workspaces/${currentWsId}` : '/workspaces';
    const query = tabKey === 'documents' ? '' : `?tab=${tabKey}`;

    navigate(`${path}${query}`);
    if (setActiveTab) setActiveTab(tabKey);
  };

  return (
    <div className="shell">
      {/* 1. Brand Island */}
      <div className="island brand-island">
        <div className="logo-mark">S</div>
        <div className="brand-name">SYNAPSE</div>
      </div>

      {/* 2. Workspace Selector Island */}
      <div className="island workspace-island" ref={dropdownRef}>
        <div
          className="workspace-pill"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          title="Switch Workspace"
        >
          <span className="folder-ico">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            </svg>
          </span>
          <span>{workspaceName}</span>
          <span className="chev">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="workspace-dropdown-menu">
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.08em',
                color: 'var(--text-faint)',
                padding: '6px 10px 4px',
                textTransform: 'uppercase',
              }}
            >
              WORKSPACES
            </div>
            {workspacesList.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: '12.5px', color: 'var(--text-faint)' }}>
                No active workspaces found
              </div>
            ) : (
              workspacesList.map((ws) => {
                const isSelected = ws.name === workspaceName;
                return (
                  <div
                    key={ws.id}
                    className={`ws-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (onSelectWorkspace) {
                        onSelectWorkspace(ws);
                      } else {
                        navigate(`/workspaces/${ws.id}`);
                      }
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                    </svg>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ws.name}
                    </span>
                    {isSelected && (
                      <span className="check-ico">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div
              className="ws-dropdown-footer"
              onClick={() => {
                setIsDropdownOpen(false);
                navigate('/workspaces');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Manage / All Workspaces</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Status Island */}
      <div className="island status-island">
        <div className="header-status">
          <span className="status-title">{getTabTitle()}</span>
        </div>
      </div>

      {/* 4. Sidebar: Stack of Islands */}
      <div className="sidebar">
        {/* Navigation Island 1: WORKSPACE */}
        <div className="island nav-island">
          <div className="nav-label">WORKSPACE</div>

          <button
            className={`nav-item ${activeTab === 'documents' || !activeTab ? 'active' : ''}`}
            onClick={() => handleNavClick('documents')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            Documents
            {docCount > 0 && <span className="badge">{docCount}</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => handleNavClick('summary')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 2 7l10 5 10-5-10-5Z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            AI summary
          </button>

          <button
            className={`nav-item ${activeTab === 'learning' ? 'active' : ''}`}
            onClick={() => handleNavClick('learning')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19V5M4 5l4 4M4 5l-4 4" transform="translate(2)" />
              <path d="M20 5v14M20 19l-4-4M20 19l4-4" transform="translate(-2)" />
            </svg>
            Learning path
          </button>

          <button
            className={`nav-item ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => handleNavClick('rag')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            RAG assistant
          </button>

          <button
            className={`nav-item ${activeTab === 'collab' ? 'active' : ''}`}
            onClick={() => handleNavClick('collab')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Collaborators
            <span className="badge">1</span>
          </button>
        </div>

        {/* Navigation Island 2: OTHERS */}
        <div className="island nav-island">
          <div className="nav-label">OTHERS</div>

          <button
            className={`nav-item ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => handleNavClick('invitations')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Invitations
          </button>

          <button
            className={`nav-item ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => handleNavClick('archived')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="5" rx="1" />
              <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" />
            </svg>
            Archived Workspaces
          </button>

          {/* Theme Toggle Button */}
          <div className="nav-item" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
          </div>
        </div>

        {/* Account Island */}
        <div className="island account-island">
          <div className="account-left">
            <div className="avatar">{userInitials}</div>
            <span className="account-name">{user?.name || 'Account'}</span>
          </div>
          <span className="logout-ico" onClick={logout} title="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </span>
        </div>
      </div>

      {/* 5. Main Area */}
      <div className="main">{children}</div>
    </div>
  );
};
