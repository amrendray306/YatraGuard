import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Unified Auth Redirect:
 * Per specification, all user types authenticate through the single common `/login` route.
 */
export function AdminLoginPage() {
  const location = useLocation();
  return <Navigate to="/login" state={{ from: location }} replace />;
}
