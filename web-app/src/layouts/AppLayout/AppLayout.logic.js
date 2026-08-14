/**
 * AppLayout — Business Logic Layer
 *
 * Handles workspace fetching, active workspace derivation, and theme toggling.
 */

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api/client';

export function useAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId: paramWorkspaceId } = useParams();
  const { user, logout } = useAuth();
  const themeCtx = useContext(ThemeContext);

  // ── Sidebar Drawer UI State ────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  // Close sidebar on mobile route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Fetch workspaces once authenticated
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const loadWorkspaces = async () => {
      setIsLoadingWorkspaces(true);
      try {
        const headers = {};
        if (user?.id) headers['X-User-ID'] = user.id;
        if (user?.email) headers['X-User-Email'] = user.email;

        const res = await apiClient.get('/api/v1/workspaces', { headers });
        const list = Array.isArray(res.data) ? res.data : (res.data?.workspaces ?? []);

        if (!isCancelled) {
          setWorkspaces(list);
        }
      } catch (err) {
        console.error('[AppLayout] Failed to load workspaces:', err);
      } finally {
        if (!isCancelled) setIsLoadingWorkspaces(false);
      }
    };

    loadWorkspaces();
    return () => { isCancelled = true; };
  }, [user]);

  // ── Active Workspace derivation ───────────────────────────────────────────
  const activeWorkspaceId = paramWorkspaceId ?? null;
  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null;
  }, [workspaces, activeWorkspaceId]);

  // ── User initials ─────────────────────────────────────────────────────────
  const userInitials = useMemo(() => {
    if (user?.name) return user.name.slice(0, 2).toUpperCase();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'US';
  }, [user]);

  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || '';

  // ── Workspace switch handler (preserves current subpath) ───────────────────
  const handleSelectWorkspace = useCallback((ws) => {
    const parts = location.pathname.split('/').filter(Boolean);
    // e.g. ['workspaces', 'ws-123', 'learning'] -> currentSubpath = 'learning'
    const currentSubpath = parts.length >= 3 ? parts[2] : 'summary';
    navigate(`/workspaces/${ws.id}/${currentSubpath}`);
  }, [navigate, location.pathname]);

  return {
    // Auth & User
    user,
    userInitials,
    userName,
    userEmail,
    logout,

    // Theme
    theme: themeCtx?.theme ?? 'light',
    toggleTheme: themeCtx?.toggleTheme ?? (() => {}),

    // Sidebar UI
    isSidebarOpen,
    closeSidebar: () => setIsSidebarOpen(false),
    toggleSidebar: () => setIsSidebarOpen((v) => !v),

    // Workspace state
    workspaces,
    isLoadingWorkspaces,
    activeWorkspace,
    activeWorkspaceId,

    // Actions
    onSelectWorkspace: handleSelectWorkspace,
    onGoHome: () => {
      if (activeWorkspaceId) {
        navigate(`/workspaces/${activeWorkspaceId}`);
      } else {
        navigate('/workspaces');
      }
    },
  };
}
