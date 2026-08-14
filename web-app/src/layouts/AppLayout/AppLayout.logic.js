/**
 * AppLayout — Business Logic Layer
 *
 * Production-ready, robust workspace management, tab state synchronizer,
 * and auto-navigation for Synapse SPA.
 */

import { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api/client';

export function useAppLayout() {
  const navigate = useNavigate();
  const { workspaceId: paramWorkspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const themeCtx = useContext(ThemeContext);

  // ── Active tab from URL query params (defaults to 'summary') ───────────────
  const activeTab = searchParams.get('tab') || 'summary';

  // ── Sidebar UI State ───────────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const wsDropdownRef = useRef(null);

  // ── Workspace State ────────────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  // Close workspace dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target)) {
        setIsWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

          // Auto-select first workspace on initial load if route has no workspaceId
          if (list.length > 0 && !paramWorkspaceId) {
            navigate(`/workspaces/${list[0].id}`, { replace: true });
          }
        }
      } catch (err) {
        console.error('[AppLayout] Failed to load workspaces:', err);
      } finally {
        if (!isCancelled) setIsLoadingWorkspaces(false);
      }
    };

    loadWorkspaces();
    return () => { isCancelled = true; };
  }, [user, paramWorkspaceId, navigate]);

  // ── Derived active workspace ───────────────────────────────────────────────
  const activeWorkspaceId = paramWorkspaceId || (workspaces.length > 0 ? workspaces[0]?.id : null);
  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null;
  }, [workspaces, activeWorkspaceId]);

  // ── User presentation derivation ───────────────────────────────────────────
  const userInitials = useMemo(() => {
    if (user?.name) return user.name.slice(0, 2).toUpperCase();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'US';
  }, [user]);

  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || '';

  // ── Navigation Handlers ───────────────────────────────────────────────────
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);
  const toggleWsDropdown = useCallback(() => setIsWsDropdownOpen((prev) => !prev), []);
  const closeWsDropdown = useCallback(() => setIsWsDropdownOpen(false), []);

  /**
   * Set active tab via navigate() which guarantees instant React Router state updates
   */
  const handleSelectTab = useCallback((tabId) => {
    setIsSidebarOpen(false);
    const wsId = activeWorkspaceId;
    const base = wsId ? `/workspaces/${wsId}` : '/workspaces';
    if (!tabId || tabId === 'summary') {
      navigate(base);
    } else {
      navigate(`${base}?tab=${tabId}`);
    }
  }, [navigate, activeWorkspaceId]);

  /**
   * Switch workspace and preserve or reset active tab
   */
  const handleSelectWorkspace = useCallback((ws) => {
    setIsWsDropdownOpen(false);
    const currentTab = searchParams.get('tab');
    const targetUrl = currentTab && currentTab !== 'summary'
      ? `/workspaces/${ws.id}?tab=${currentTab}`
      : `/workspaces/${ws.id}`;
    navigate(targetUrl);
  }, [navigate, searchParams]);

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

    // Sidebar & Dropdown UI
    isSidebarOpen,
    closeSidebar,
    toggleSidebar,
    isWsDropdownOpen,
    toggleWsDropdown,
    closeWsDropdown,
    wsDropdownRef,

    // Workspace state
    workspaces,
    isLoadingWorkspaces,
    activeWorkspace,
    activeWorkspaceId,

    // Tab Navigation
    activeTab,
    onSelectTab: handleSelectTab,
    onSelectWorkspace: handleSelectWorkspace,
    onGoHome: () => navigate('/workspaces'),
  };
}
