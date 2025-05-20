import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../Firebase/AuthContext';

/**
 * Component that controls access to routes based on authentication status
 * Redirects unauthenticated users to login page
 * Redirects authenticated users away from auth pages
 */
function AuthGuard({ children }) {
  const { isAuthenticated, currentUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Only run navigation logic if segments is available
    if (!segments) return;
    
    const inAuthGroup = segments[0] === 'authentication';
    const isLoginPage = segments[1] === 'login';
    const isRegisterPage = segments[1] === 'register';
    
    if (!isAuthenticated && !inAuthGroup) {
      // If user is not authenticated and trying to access a protected route,
      // redirect to login
      router.replace('/authentication/login');
    } else if (isAuthenticated && inAuthGroup && !isLoginPage) {
      // If user is authenticated and trying to access an auth route other than login,
      // redirect to home
      // This allows navigation to login page after registration
      router.replace('/tabs/home');
    }
  }, [isAuthenticated, segments, router]);

  return <>{children}</>;
}

export default AuthGuard;
