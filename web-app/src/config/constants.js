/**
 * Application Constants and Route Definitions
 */

export const APP_CONFIG = {
  name: 'SYNAPSE',
  description: 'AI-Powered Collaborative Document & Learning Platform',
  version: '1.0.0',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  WORKSPACES: '/workspaces',
  WORKSPACE_DETAIL: (id = ':workspaceId') => `/workspaces/${id}`,
  DOCUMENTS: '/documents',
  DOCUMENT_DETAIL: (id = ':documentId') => `/documents/${id}`,
  LEARNING_PATH: (id = ':workspaceId') => `/workspaces/${id}/learning-path`,
  SETTINGS: '/settings',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'synapse_access_token',
  USER: 'synapse_user',
  THEME: 'synapse_theme',
};
