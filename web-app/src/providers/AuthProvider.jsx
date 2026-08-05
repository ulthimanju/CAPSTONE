import React from 'react';
import { useInitializeAuth } from '../hooks/useInitializeAuth';

export const AuthProvider = ({ children }) => {
  useInitializeAuth();
  return <>{children}</>;
};
