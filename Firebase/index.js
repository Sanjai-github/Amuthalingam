// Export all Firebase services
// Import directly from config to avoid circular dependencies
import { auth, db, storage, app } from './config';

// Import services
import * as authService from './auth';
import * as firestoreService from './firestore';
import * as vendorService from './vendorService';
import * as customerService from './customerService';
import * as summaryService from './summaryService';

// Import auth context separately to avoid circular dependencies
import AuthContext, { AuthProvider, useAuth } from './AuthContext';

// Export everything
export {
  app,
  auth,
  db,
  storage,
  authService,
  firestoreService,
  vendorService,
  customerService,
  summaryService,
  AuthContext,
  AuthProvider,
  useAuth
};
