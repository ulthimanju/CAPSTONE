/**
 * Sidebar Navigation Configuration
 *
 * Single source of truth for all sidebar sections and navigation routes.
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

export { Sun, Moon };

export const SIDEBAR_NAV_SECTIONS = [
  {
    label: 'Workspace Related',
    items: [
      { id: 'summary',       label: 'Summary',       icon: House,         subpath: 'summary'       },
      { id: 'learning',      label: 'Learning Path', icon: BookOpen,      subpath: 'learning'      },
      { id: 'documents',     label: 'Documents',     icon: FileText,      subpath: 'documents'     },
      { id: 'chat',          label: 'Chat',          icon: MessageSquare, subpath: 'chat'          },
      { id: 'collaborators', label: 'Collaborators', icon: Users,         subpath: 'collaborators' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { id: 'invitations', label: 'Invitations',         icon: Mail,    subpath: 'invitations' },
      { id: 'archived',    label: 'Archived Workspaces', icon: Archive, subpath: 'archived'    },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'theme', label: 'Theme', icon: Sun, action: 'toggle-theme' },
    ],
  },
];
