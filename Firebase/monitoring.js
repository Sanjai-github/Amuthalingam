import * as Sentry from '@sentry/react-native';
import firebase from './config';

/**
 * Initialize monitoring services (Sentry and Firebase Analytics)
 * 
 * @param {String} sentryDsn - Sentry DSN for error reporting
 * @param {Object} options - Additional configuration options
 * @returns {Boolean} Whether initialization was successful
 */
export const initializeMonitoring = (sentryDsn, options = {}) => {
  try {
    // Initialize Sentry for error reporting
    Sentry.init({
      dsn: sentryDsn,
      debug: __DEV__, // Enable debug in development
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 10000,
      tracesSampleRate: 1.0,
      // Set environment based on development mode
      environment: __DEV__ ? 'development' : 'production',
      // Additional configuration
      ...options
    });
    
    // Log initialization to Firebase Analytics
    firebase.analytics().logEvent('monitoring_initialized');
    
    return true;
  } catch (error) {
    console.error('Error initializing monitoring:', error);
    return false;
  }
};

/**
 * Set user information for both Sentry and Firebase Analytics
 * 
 * @param {String} userId - User ID
 * @param {Object} userInfo - Additional user information (email, name, etc.)
 */
export const setUserContext = (userId, userInfo = {}) => {
  try {
    if (!userId) return;
    
    // Set user context in Sentry
    Sentry.setUser({
      id: userId,
      ...userInfo
    });
    
    // Set user ID in Firebase Analytics
    firebase.analytics().setUserId(userId);
    
    // Set user properties in Firebase Analytics
    if (userInfo) {
      Object.entries(userInfo).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          firebase.analytics().setUserProperty(key, String(value));
        }
      });
    }
  } catch (error) {
    console.error('Error setting user context:', error);
  }
};

/**
 * Clear user information from both Sentry and Firebase Analytics
 */
export const clearUserContext = () => {
  try {
    // Clear user context in Sentry
    Sentry.setUser(null);
    
    // Clear user ID in Firebase Analytics
    firebase.analytics().setUserId(null);
  } catch (error) {
    console.error('Error clearing user context:', error);
  }
};

/**
 * Log an event to Firebase Analytics and optionally Sentry
 * 
 * @param {String} eventName - Name of the event
 * @param {Object} params - Event parameters
 * @param {Boolean} logToSentry - Whether to also log to Sentry
 */
export const logEvent = (eventName, params = {}, logToSentry = false) => {
  try {
    // Log event to Firebase Analytics
    firebase.analytics().logEvent(eventName, params);
    
    // Optionally log to Sentry
    if (logToSentry) {
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: `Event: ${eventName}`,
        data: params,
        level: 'info'
      });
    }
  } catch (error) {
    console.error(`Error logging event ${eventName}:`, error);
  }
};

/**
 * Log an error to Sentry and Firebase Analytics
 * 
 * @param {Error} error - The error to log
 * @param {String} context - Additional context about where the error occurred
 * @param {Object} extraData - Additional data to include with the error
 */
export const logError = (error, context = '', extraData = {}) => {
  try {
    // Prepare error data
    const errorData = {
      ...extraData,
      context
    };
    
    // Log to Firebase Analytics
    firebase.analytics().logEvent('app_error', {
      error_message: error.message,
      error_stack: error.stack,
      ...errorData
    });
    
    // Log to Sentry
    Sentry.withScope(scope => {
      scope.setExtras(errorData);
      Sentry.captureException(error);
    });
  } catch (captureError) {
    console.error('Error logging error to monitoring services:', captureError);
    console.error('Original error:', error);
  }
};

/**
 * Start performance monitoring for a specific operation
 * 
 * @param {String} operationName - Name of the operation to monitor
 * @returns {Object} Transaction object for ending the monitoring
 */
export const startPerformanceMonitoring = (operationName) => {
  try {
    // Create a Sentry transaction
    const transaction = Sentry.startTransaction({
      name: operationName,
    });
    
    // Start a Firebase performance trace
    const trace = firebase.performance().trace(operationName);
    
    return {
      transaction,
      trace,
      finish: (status = 'ok') => {
        // End the Firebase trace
        trace.stop();
        
        // Set transaction status and finish
        transaction.setStatus(status);
        transaction.finish();
      }
    };
  } catch (error) {
    console.error(`Error starting performance monitoring for ${operationName}:`, error);
    return {
      finish: () => {} // No-op function if monitoring failed to start
    };
  }
};

/**
 * Add an error boundary to a component
 * 
 * @param {React.Component} Component - The component to wrap with an error boundary
 * @param {String} componentName - The name of the component (for error reporting)
 * @returns {React.Component} Component wrapped with Sentry error boundary
 */
export const withErrorBoundary = (Component, componentName) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: ({ error, resetError }) => (
      <ErrorFallback 
        error={error} 
        resetError={resetError} 
        componentName={componentName} 
      />
    ),
    showDialog: false
  });
};
