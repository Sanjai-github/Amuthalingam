import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';
import * as authService from './auth';

// Create the authentication context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component that wraps the app and provides the auth context
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state changes directly using Firebase auth
  useEffect(() => {
    // Important: We use the auth instance directly from config.js
    // instead of going through index.js to avoid circular dependencies
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Auth context value
  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    login: authService.loginUser,
    register: authService.registerUser,
    logout: authService.logoutUser,
    resetPassword: authService.resetPassword,
    updateProfile: authService.updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        // Show a loading indicator or splash screen while auth is initializing
        <React.Fragment />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;
