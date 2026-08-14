/**
 * Sidebar Navigation Configuration
 *
 * Single source of truth for all sidebar sections and navigation items.
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

export const SIDEBAR_CONFIG = [
  {
    label: 'Workspace Related',
    items: [
      { id: 'summary',       label: 'Summary',       icon: House,         tab: 'summary'       },
      { id: 'learning',      label: 'Learning Path', icon: BookOpen,      tab: 'learning'      },
      { id: 'documents',     label: 'Documents',     icon: FileText,      tab: 'documents'     },
      { id: 'chat',          label: 'Chat',          icon: MessageSquare, tab: 'chat'          },
      { id: 'collaborators', label: 'Collaborators', icon: Users,         tab: 'collaborators' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { id: 'invitations', label: 'Invitations',         icon: Mail,    tab: 'invitations' },
      { id: 'archived',    label: 'Archived Workspaces', icon: Archive, tab: 'archived'    },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'theme', label: 'Theme', icon: Sun, action: 'toggle-theme' },
    ],
  },
];
