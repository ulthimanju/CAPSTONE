/**
 * AppLayout — Business Logic Layer
 *
 * Consumes useWorkspaceStore for workspace collection and derives UI states.
 * Uses location and params to keep URL strictly authoritative.
 */

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceStore } from '../../store/workspaceStore';

const WORKSPACE_TABS = ['summary', 'learning', 'documents', 'chat', 'collaborators', 'invitations'];

export function useAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId: paramWorkspaceId } = useParams();
  const { user, logout } = useAuth();
  const themeCtx = useContext(ThemeContext);

  const { workspaces, isLoading: isLoadingWorkspaces, fetchWorkspaces } = useWorkspaceStore();

  // ── Sidebar Drawer UI State ────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on mobile route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Fetch workspaces once authenticated (managed cleanly by Zustand store)
  useEffect(() => {
    if (user) {
      fetchWorkspaces(user);
    }
  }, [user, fetchWorkspaces]);

  // ── Active Workspace derivation (strictly URL authoritative) ───────────────
  const activeWorkspaceId = paramWorkspaceId ?? null;
  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  }, [workspaces, activeWorkspaceId]);

  // ── User initials ─────────────────────────────────────────────────────────
  const userInitials = useMemo(() => {
    if (user?.name) return user.name.slice(0, 2).toUpperCase();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'US';
  }, [user]);

  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || '';

  // ── Workspace switch handler (preserves valid current tab) ──────────────────
  const handleSelectWorkspace = useCallback((ws) => {
    const match = location.pathname.match(/^\/workspaces\/[^/]+\/([^/]+)$/);
    const currentTab = (match?.[1] && WORKSPACE_TABS.includes(match[1])) ? match[1] : 'summary';
    navigate(`/workspaces/${ws.id}/${currentTab}`);
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
    isLearningUnitPage: Boolean(location.pathname.match(/\/workspaces\/[^/]+\/learning\/[^/]+/)),

    // Actions
    onSelectWorkspace: handleSelectWorkspace,
    onGoHome: () => {
      if (activeWorkspaceId) {
        navigate(`/workspaces/${activeWorkspaceId}/summary`);
      } else {
        navigate('/workspaces');
      }
    },
  };
}
