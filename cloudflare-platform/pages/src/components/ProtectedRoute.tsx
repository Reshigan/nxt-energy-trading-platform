import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { getRoleConfig } from '../config/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — enforces role-based access control on frontend routes.
 * Checks whether the current user's role has the current path in allowedPaths.
 * Redirects unauthorized users to '/' (cockpit) with a 'forbidden' flag.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, activeRole } = useAuthStore();
  const location = useLocation();

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Get role config and check allowed paths
  const roleConfig = getRoleConfig(activeRole || 'trader');
  const currentPath = location.pathname;

  // Always allow root cockpit, settings, notifications, support, and contract deep links
  const alwaysAllowed = ['/', '/cockpit', '/settings', '/notifications', '/support', '/changelog'];
  if (alwaysAllowed.includes(currentPath) || currentPath.startsWith('/contracts/')) {
    return <>{children}</>;
  }

  // Check if the path is in allowedPaths
  const isAllowed = roleConfig.allowedPaths.some(
    (p) => currentPath === p || currentPath.startsWith(p + '/')
  );

  if (!isAllowed) {
    return <Navigate to="/" replace state={{ forbidden: true }} />;
  }

  return <>{children}</>;
}
