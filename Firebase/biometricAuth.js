import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from './config';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const CREDENTIALS_STORAGE_KEY = 'encrypted_credentials';

/**
 * Check if biometric authentication is available on the device
 * 
 * @returns {Object} Object with availability info and supported types
 */
export const isBiometricAvailable = async () => {
  try {
    const available = await LocalAuthentication.hasHardwareAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    return { 
      available, 
      hasFaceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      hasFingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
      canUse: available && types.length > 0
    };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return { available: false, hasFaceId: false, hasFingerprint: false, canUse: false };
  }
};

/**
 * Enable biometric login for the current user
 * 
 * @param {String} email - User's email
 * @param {String} password - User's password
 * @returns {Boolean} Whether biometric login was successfully enabled
 */
export const enableBiometricLogin = async (email, password) => {
  try {
    // Check if device supports biometrics
    const { canUse } = await isBiometricAvailable();
    if (!canUse) {
      throw new Error('Biometric authentication not available on this device');
    }

    // Encrypt credentials (in a real app, use more secure encryption)
    // This is a simplified implementation - in production, use a proper encryption library
    const encryptedCredentials = JSON.stringify({ email, password });
    
    // Save encrypted credentials to secure storage
    await AsyncStorage.setItem(CREDENTIALS_STORAGE_KEY, encryptedCredentials);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    
    return true;
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    throw error;
  }
};

/**
 * Disable biometric login
 * 
 * @returns {Boolean} Whether biometric login was successfully disabled
 */
export const disableBiometricLogin = async () => {
  try {
    // Remove stored credentials and settings
    await AsyncStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    return true;
  } catch (error) {
    console.error('Error disabling biometric login:', error);
    throw error;
  }
};

/**
 * Check if biometric login is enabled
 * 
 * @returns {Boolean} Whether biometric login is enabled
 */
export const isBiometricLoginEnabled = async () => {
  try {
    return await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
  } catch (error) {
    console.error('Error checking if biometric login is enabled:', error);
    return false;
  }
};

/**
 * Authenticate with biometrics and login
 * 
 * @returns {Boolean} Whether authentication was successful
 */
export const authenticateWithBiometrics = async () => {
  try {
    // Check if biometric login is enabled
    const isEnabled = await isBiometricLoginEnabled();
    if (!isEnabled) {
      throw new Error('Biometric login not enabled');
    }

    // Authenticate with biometrics
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Project-Track',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });

    if (result.success) {
      // Get stored credentials
      const encryptedCredentials = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (!encryptedCredentials) {
        throw new Error('No stored credentials found');
      }

      // Decrypt credentials
      const { email, password } = JSON.parse(encryptedCredentials);
      
      // Sign in with Firebase
      await firebase.auth().signInWithEmailAndPassword(email, password);
      return true;
    } else {
      throw new Error('Biometric authentication failed');
    }
  } catch (error) {
    console.error('Error authenticating with biometrics:', error);
    throw error;
  }
};

/**
 * Show biometric authentication prompt without logging in
 * Useful for confirming sensitive actions
 * 
 * @param {String} promptMessage - Message to display in the authentication prompt
 * @returns {Boolean} Whether authentication was successful
 */
export const verifyWithBiometrics = async (promptMessage = 'Verify your identity') => {
  try {
    const { canUse } = await isBiometricAvailable();
    if (!canUse) {
      throw new Error('Biometric authentication not available on this device');
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error('Error verifying with biometrics:', error);
    throw error;
  }
};
