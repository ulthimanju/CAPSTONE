export const API_ENDPOINTS = {
  OAUTH: {
    GOOGLE_LOGIN: '/api/v1/oauth/google/login',
    GOOGLE_CALLBACK: '/api/v1/oauth/google/callback',
  },
  TOKENS: {
    REFRESH: '/tokens/refresh',
  },
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
  },
  SESSIONS: {
    LIST: '/sessions',
    LOGOUT: '/sessions/logout',
    LOGOUT_ALL: '/sessions/logout-all',
    REVOKE: (id) => `/sessions/${id}`,
  },
  HEALTH: '/health',
};
