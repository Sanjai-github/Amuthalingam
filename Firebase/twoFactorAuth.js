import firebase from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const TFA_ENABLED_KEY = 'two_factor_auth_enabled';
const TFA_PHONE_KEY = 'two_factor_auth_phone';

/**
 * Check if two-factor authentication is enabled
 * 
 * @returns {Boolean} Whether 2FA is enabled
 */
export const isTwoFactorEnabled = async () => {
  try {
    return await AsyncStorage.getItem(TFA_ENABLED_KEY) === 'true';
  } catch (error) {
    console.error('Error checking if 2FA is enabled:', error);
    return false;
  }
};

/**
 * Get the phone number associated with 2FA
 * 
 * @returns {String|null} The phone number or null if not found
 */
export const getTwoFactorPhone = async () => {
  try {
    return await AsyncStorage.getItem(TFA_PHONE_KEY);
  } catch (error) {
    console.error('Error getting 2FA phone:', error);
    return null;
  }
};

/**
 * Start the 2FA setup process by sending a verification code
 * 
 * @param {String} phoneNumber - The phone number to use for 2FA
 * @returns {String} The verification ID to use when confirming the code
 */
export const setupTwoFactorAuth = async (phoneNumber) => {
  try {
    // Check if user is authenticated
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to set up 2FA');
    }
    
    // Start phone verification
    const phoneProvider = new firebase.auth.PhoneAuthProvider();
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      // recaptchaVerifier is needed for web, but not for native apps
      // For native apps, Firebase handles this internally
      60, // timeout in seconds
    );
    
    // Save the phone number temporarily (will be confirmed after verification)
    await AsyncStorage.setItem(TFA_PHONE_KEY + '_temp', phoneNumber);
    
    return verificationId;
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    throw error;
  }
};

/**
 * Verify the code sent to the user's phone
 * 
 * @param {String} verificationId - The verification ID from setupTwoFactorAuth
 * @param {String} verificationCode - The code received via SMS
 * @returns {Boolean} Whether verification was successful
 */
export const verifyTwoFactorCode = async (verificationId, verificationCode) => {
  try {
    // Create credential with verification ID and code
    const credential = firebase.auth.PhoneAuthProvider.credential(
      verificationId,
      verificationCode
    );
    
    // Get current user
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to verify 2FA');
    }
    
    // Link phone auth credential to current user
    await currentUser.linkWithCredential(credential);
    
    // Update user profile to indicate 2FA is enabled
    await currentUser.updateProfile({
      phoneVerified: true
    });
    
    // Get the temporary phone number
    const phoneNumber = await AsyncStorage.getItem(TFA_PHONE_KEY + '_temp');
    
    // Save the verified phone number and enable 2FA
    await AsyncStorage.setItem(TFA_PHONE_KEY, phoneNumber);
    await AsyncStorage.setItem(TFA_ENABLED_KEY, 'true');
    
    // Remove the temporary phone number
    await AsyncStorage.removeItem(TFA_PHONE_KEY + '_temp');
    
    return true;
  } catch (error) {
    console.error("Error verifying 2FA code:", error);
    throw error;
  }
};

/**
 * Verify a user during login with 2FA
 * 
 * @param {String} phoneNumber - The phone number to send the code to
 * @returns {String} The verification ID to use when confirming the code
 */
export const sendTwoFactorVerification = async (phoneNumber) => {
  try {
    // Start phone verification
    const phoneProvider = new firebase.auth.PhoneAuthProvider();
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      60, // timeout in seconds
    );
    
    return verificationId;
  } catch (error) {
    console.error("Error sending 2FA verification:", error);
    throw error;
  }
};

/**
 * Complete login with 2FA by verifying the code
 * 
 * @param {String} verificationId - The verification ID from sendTwoFactorVerification
 * @param {String} verificationCode - The code received via SMS
 * @returns {UserCredential} The Firebase user credential
 */
export const completeTwoFactorLogin = async (verificationId, verificationCode) => {
  try {
    // Create credential with verification ID and code
    const credential = firebase.auth.PhoneAuthProvider.credential(
      verificationId,
      verificationCode
    );
    
    // Sign in with credential
    const userCredential = await firebase.auth().signInWithCredential(credential);
    return userCredential;
  } catch (error) {
    console.error("Error completing 2FA login:", error);
    throw error;
  }
};

/**
 * Disable two-factor authentication
 * 
 * @returns {Boolean} Whether 2FA was successfully disabled
 */
export const disableTwoFactorAuth = async () => {
  try {
    // Check if user is authenticated
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to disable 2FA');
    }
    
    // Update user profile to indicate 2FA is disabled
    await currentUser.updateProfile({
      phoneVerified: false
    });
    
    // Remove 2FA settings
    await AsyncStorage.removeItem(TFA_PHONE_KEY);
    await AsyncStorage.setItem(TFA_ENABLED_KEY, 'false');
    
    return true;
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    throw error;
  }
};
