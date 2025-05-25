import React, { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../Firebase/AuthContext';

/**
 * Component that controls access to routes based on authentication status
 * Redirects unauthenticated users to login page
 * Redirects authenticated users away from auth pages
 * Prevents unnecessary redirects when auth state is still loading
 */
function AuthGuard({ children }) {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);

  useEffect(() => {
    // Skip navigation logic if still loading or segments not available
    if (loading || !segments) return;
    
    const inAuthGroup = segments[0] === 'authentication';
    const isLoginPage = segments[1] === 'login';
    const isRegisterPage = segments[1] === 'register';
    const isForgotPasswordPage = segments[1] === 'forgot-password';
    
    // Only perform redirection if this isn't the initial auth check
    // or if we're sure about the authentication state
    if (!initialAuthCheck) {
      setInitialAuthCheck(true);
      return;
    }
    
    if (!isAuthenticated && !inAuthGroup) {
      // If user is not authenticated and trying to access a protected route,
      // redirect to login
      router.replace('/authentication/login');
    } else if (isAuthenticated && inAuthGroup) {
      // If user is authenticated and trying to access any auth route,
      // redirect to home
      router.replace('/tabs/home');
    }
  }, [isAuthenticated, segments, router, loading, initialAuthCheck]);

  return <>{children}</>;
}

export default AuthGuard;
