/**
 * AppLayout — Business Logic Layer
 *
 * Handles: sidebar open/close state, workspace fetching, theme toggling,
 * route-aware active-tab detection, user data derivation.
 * Contains zero JSX.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api/client';

/** Derive which nav item is active from the current URL */
function resolveActiveTab(pathname, searchParams) {
  if (pathname === '/invitations')             return 'invitations';
  if (pathname === '/profile')                 return 'profile';
  if (pathname === '/sessions')                return 'sessions';

  const tab = searchParams.get('tab');
  if (tab === 'learning')                      return 'learning';
  if (tab === 'rag' || tab === 'chat')         return 'rag';
  if (tab === 'collab')                        return 'collab';
  if (tab === 'documents')                     return 'documents';
  if (tab === 'archived')                      return 'archived';

  // Default workspace route is the summary tab
  if (pathname.startsWith('/workspaces'))      return 'summary';
  return null;
}

/** Extract workspaceId from a workspace detail path */
function extractWorkspaceId(pathname) {
  const match = pathname.match(/\/workspaces\/([^/]+)/);
  return match ? match[1] : null;
}

export function useAppLayout() {
  const navigate        = useNavigate();
  const location        = useLocation();
  const [searchParams]  = useSearchParams();
  const { user, logout } = useAuth();
  const themeCtx        = useContext(ThemeContext);

  // ── Sidebar open/close (mobile drawer) ──────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen]     = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const wsDropdownRef = useRef(null);

  // ── Workspace list ───────────────────────────────────────────────────────
  const [workspaces, setWorkspaces]           = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWS] = useState(false);

  // Close sidebar on every route change (mobile UX)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname, location.search]);

  // Close workspace dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target)) {
        setIsWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch workspaces once the user is available
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchWorkspaces = async () => {
      setIsLoadingWS(true);
      try {
        const headers = {};
        if (user?.id)    headers['X-User-ID']    = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;

        const res  = await apiClient.get('/api/v1/workspaces', { headers });
        const data = res.data;
        if (!cancelled) {
          const wsList = Array.isArray(data) ? data : (data.workspaces ?? []);
          setWorkspaces(wsList);

          // Auto-select first workspace on initial load if on bare /workspaces route
          if (wsList.length > 0) {
            const currentPath = window.location.pathname;
            const currentWs = extractWorkspaceId(currentPath);
            if (!currentWs || currentPath === '/workspaces' || currentPath === '/workspaces/') {
              navigate(`/workspaces/${wsList[0].id}`, { replace: true });
            }
          }
        }
      } catch (err) {
        console.error('[AppLayout] Failed to fetch workspaces:', err);
      } finally {
        if (!cancelled) setIsLoadingWS(false);
      }
    };

    fetchWorkspaces();
    return () => { cancelled = true; };
  }, [user, navigate]);

  // ── Derived values ───────────────────────────────────────────────────────
  const activeTab        = resolveActiveTab(location.pathname, searchParams);
  const currentWsId      = extractWorkspaceId(location.pathname);
  const activeWorkspaceId = currentWsId ?? (workspaces.length > 0 ? workspaces[0]?.id : null);
  const activeWorkspace  = workspaces.find(ws => ws.id === activeWorkspaceId) ?? workspaces[0] ?? null;

  const userInitials = (() => {
    if (user?.name)  return user.name.slice(0, 2).toUpperCase();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'US';
  })();

  const userName  = user?.name  || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || '';

  // ── Actions ──────────────────────────────────────────────────────────────
  const closeSidebar   = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar  = useCallback(() => setIsSidebarOpen(v => !v), []);
  const toggleWsDropdown = useCallback(() => setIsWsDropdownOpen(v => !v), []);
  const closeWsDropdown  = useCallback(() => setIsWsDropdownOpen(false), []);

  const handleNavigate = useCallback((path) => {
    navigate(path);
    setIsSidebarOpen(false);
  }, [navigate]);

  const handleSelectWorkspace = useCallback((ws) => {
    setIsWsDropdownOpen(false);
    navigate(`/workspaces/${ws.id}`);
  }, [navigate]);

  const handleTabNav = useCallback((tab) => {
    const wsId = activeWorkspaceId;
    const base = wsId ? `/workspaces/${wsId}` : '/workspaces';

    const paths = {
      summary   : base,
      learning  : `${base}?tab=learning`,
      rag       : `${base}?tab=rag`,
      collab    : `${base}?tab=collab`,
      documents : `${base}?tab=documents`,
      invitations: '/invitations',
      profile   : '/profile',
      sessions  : '/sessions',
    };

    const path = paths[tab] ?? base;
    navigate(path);
    setIsSidebarOpen(false);
  }, [navigate, activeWorkspaceId]);

  return {
    // User
    user, userInitials, userName, userEmail, logout,

    // Theme
    theme       : themeCtx?.theme ?? 'light',
    toggleTheme : themeCtx?.toggleTheme ?? (() => {}),

    // Sidebar state
    isSidebarOpen, closeSidebar, toggleSidebar,

    // Workspace dropdown
    isWsDropdownOpen, toggleWsDropdown, closeWsDropdown, wsDropdownRef,

    // Data
    workspaces, isLoadingWorkspaces, activeWorkspace, activeWorkspaceId,

    // Navigation
    activeTab, handleTabNav, handleNavigate, handleSelectWorkspace,
  };
}
