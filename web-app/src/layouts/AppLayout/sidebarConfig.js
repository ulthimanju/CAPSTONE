/**
 * Sidebar Navigation Configuration
 *
 * Single source of truth for all sidebar items and sections.
 * Adding, removing, or reordering items is a configuration change — never a UI rewrite.
 *
 * Each item has:
 *   id       — unique key, also used for active-state detection
 *   label    — display text
 *   icon     — Lucide React component
 *   path?    — logical path (resolved to actual URL by resolvePath)
 *   action?  — special action id instead of navigation (e.g. "toggle-theme")
 */

import {
  House,
  BookOpen,
  FileText,
  MessageSquare,
  Users,
  Mail,
  Archive,
  Sun,
  Moon,
} from 'lucide-react';

export { Sun, Moon }; // re-export for dynamic theme icon usage in components

/** @type {Array<{label: string, items: Array<SidebarItem>}>} */
export const sidebarSections = [
  {
    label: 'Workspace Related',
    items: [
      { id: 'summary',       label: 'Summary',              icon: House,         path: '/summary'       },
      { id: 'learning',      label: 'Learning Path',        icon: BookOpen,      path: '/learning'      },
      { id: 'documents',     label: 'Documents',            icon: FileText,      path: '/documents'     },
      { id: 'chat',          label: 'Chat',                 icon: MessageSquare, path: '/chat'          },
      { id: 'collaborators', label: 'Collaborators',        icon: Users,         path: '/collaborators' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { id: 'invitations', label: 'Invitations',         icon: Mail,    path: '/invitations' },
      { id: 'archived',    label: 'Archived Workspaces', icon: Archive, path: '/archived'    },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'theme', label: 'Theme', icon: Sun, action: 'toggle-theme' },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Path resolution
// Maps logical item IDs to real app URLs, accounting for workspace context.
// Workspace-related items use query params; standalone items use their own routes.
// ──────────────────────────────────────────────────────────────────────────────

const WORKSPACE_TAB_MAP = {
  summary:       (base) => base,
  learning:      (base) => `${base}?tab=learning`,
  documents:     (base) => `${base}?tab=documents`,
  chat:          (base) => `${base}?tab=chat`,
  collaborators: (base) => `${base}?tab=collaborators`,
  invitations:   (base) => '/workspaces?tab=invitations',
  archived:      (base) => `${base}?tab=archived`,
};

/**
 * Resolve a config item's logical path to an actual navigable URL.
 * @param {SidebarItem} item
 * @param {string|null}  workspaceId  — current workspace id from URL
 * @returns {string|null}  null for action-only items
 */
export function resolvePath(item, workspaceId) {
  if (item.action) return null;

  const base = workspaceId ? `/workspaces/${workspaceId}` : '/workspaces';

  if (item.id in WORKSPACE_TAB_MAP) {
    return WORKSPACE_TAB_MAP[item.id](base);
  }

  // Non-workspace items use their configured path directly
  return item.path;
}

// ──────────────────────────────────────────────────────────────────────────────
// Active state detection
// NavLink's default isActive doesn't handle query-param based tab routing.
// This helper correctly determines active state for all item types.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @param {SidebarItem} item
 * @param {{ pathname: string, search: string }} location  — from useLocation()
 * @returns {boolean}
 */
export function isItemActive(item, location) {
  if (item.action) return false;

  const { pathname, search } = location;
  const tab = new URLSearchParams(search).get('tab');
  const onWorkspace = pathname.startsWith('/workspaces');

  switch (item.id) {
    case 'summary':       return onWorkspace && (!tab || tab === 'summary');
    case 'learning':      return onWorkspace && tab === 'learning';
    case 'documents':     return onWorkspace && tab === 'documents';
    case 'chat':          return onWorkspace && tab === 'chat';
    case 'collaborators': return onWorkspace && tab === 'collaborators';
    case 'invitations':   return onWorkspace && tab === 'invitations';
    case 'archived':      return onWorkspace && tab === 'archived';
    default:              return false;
  }
}
