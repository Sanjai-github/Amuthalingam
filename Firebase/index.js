// Export all Firebase services
// Import directly from config to avoid circular dependencies
import { auth, db, storage, app } from './config';

// Import services
import * as authService from './auth';
import * as firestoreService from './firestore';
import * as vendorService from './vendorService';
import * as customerService from './customerService';
import * as summaryService from './summaryService';
import * as vendorPaymentService from './vendorPaymentService';
import * as pdfService from './pdfService';
import * as resetService from './resetService';

// Import auth context separately to avoid circular dependencies
import AuthContext, { AuthProvider, useAuth } from './AuthContext';

// Import new technical improvement modules
import * as optimizedQueries from './optimizedQueries';
import * as biometricAuth from './biometricAuth';
import * as twoFactorAuth from './twoFactorAuth';
import * as encryption from './encryption';
import * as monitoring from './monitoring';

// Export everything
export {
  // Firebase core
  app,
  auth,
  db,
  storage,
  
  // Original services
  authService,
  firestoreService,
  vendorService,
  customerService,
  summaryService,
  vendorPaymentService,
  pdfService,
  resetService,
  
  // Auth context
  AuthContext,
  AuthProvider,
  useAuth,
  
  // Technical improvements
  optimizedQueries,
  biometricAuth,
  twoFactorAuth,
  encryption,
  monitoring
};
