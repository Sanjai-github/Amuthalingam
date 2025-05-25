import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import firebase from './config';

// Storage key for encryption
const ENCRYPTION_KEY_SALT = 'project_track_secure_salt';

/**
 * Generate a secure encryption key for the user
 * 
 * @param {String} userId - The user's ID
 * @returns {String} The encryption key
 */
const generateEncryptionKey = async (userId) => {
  try {
    // Check if we already have a stored key for this user
    const storedKey = await AsyncStorage.getItem(`encryption_key_${userId}`);
    
    if (storedKey) {
      return storedKey;
    }
    
    // Generate a new key based on user ID and a random salt
    const randomSalt = Math.random().toString(36).substring(2, 15);
    const newKey = CryptoJS.SHA256(`${userId}_${ENCRYPTION_KEY_SALT}_${randomSalt}`).toString();
    
    // Store the key for future use
    await AsyncStorage.setItem(`encryption_key_${userId}`, newKey);
    
    return newKey;
  } catch (error) {
    console.error("Error generating encryption key:", error);
    // Fallback to a deterministic but less secure key if storage fails
    return CryptoJS.SHA256(`${userId}_${ENCRYPTION_KEY_SALT}`).toString();
  }
};

/**
 * Encrypt sensitive data
 * 
 * @param {Object|String} data - The data to encrypt
 * @param {String} userId - The user's ID
 * @returns {String} The encrypted data
 */
export const encryptData = async (data, userId) => {
  try {
    const key = await generateEncryptionKey(userId);
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return CryptoJS.AES.encrypt(dataString, key).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
};

/**
 * Decrypt encrypted data
 * 
 * @param {String} encryptedData - The encrypted data
 * @param {String} userId - The user's ID
 * @returns {Object|String} The decrypted data
 */
export const decryptData = async (encryptedData, userId) => {
  try {
    const key = await generateEncryptionKey(userId);
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    // Try to parse as JSON if it looks like a JSON object
    try {
      if (decryptedString.startsWith('{') || decryptedString.startsWith('[')) {
        return JSON.parse(decryptedString);
      }
    } catch (e) {
      // If parsing fails, return as string
    }
    
    return decryptedString;
  } catch (error) {
    console.error("Decryption error:", error);
    throw error;
  }
};

/**
 * Add a document with encrypted fields to Firestore
 * 
 * @param {String} collection - The collection to add the document to
 * @param {Object} data - The document data
 * @param {Array} encryptFields - Array of field names to encrypt
 * @param {String} userId - The user's ID
 * @returns {String} The ID of the created document
 */
export const addEncryptedDocument = async (collection, data, encryptFields = [], userId) => {
  try {
    // Clone the data to avoid modifying the original
    const processedData = { ...data };
    
    // Encrypt specified fields
    for (const field of encryptFields) {
      if (processedData[field] !== undefined) {
        processedData[field] = await encryptData(processedData[field], userId);
        // Add a flag to indicate this field is encrypted
        processedData[`${field}_encrypted`] = true;
      }
    }
    
    // Add metadata
    processedData.hasEncryptedFields = encryptFields.length > 0;
    processedData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    processedData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    
    // Add the document to Firestore
    const docRef = await firebase.firestore().collection(collection).add(processedData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding encrypted document:", error);
    throw error;
  }
};

/**
 * Update a document with encrypted fields in Firestore
 * 
 * @param {String} collection - The collection containing the document
 * @param {String} docId - The ID of the document to update
 * @param {Object} data - The data to update
 * @param {Array} encryptFields - Array of field names to encrypt
 * @param {String} userId - The user's ID
 * @returns {Boolean} Whether the update was successful
 */
export const updateEncryptedDocument = async (collection, docId, data, encryptFields = [], userId) => {
  try {
    // Clone the data to avoid modifying the original
    const processedData = { ...data };
    
    // Encrypt specified fields
    for (const field of encryptFields) {
      if (processedData[field] !== undefined) {
        processedData[field] = await encryptData(processedData[field], userId);
        // Add a flag to indicate this field is encrypted
        processedData[`${field}_encrypted`] = true;
      }
    }
    
    // Add metadata
    if (encryptFields.length > 0) {
      processedData.hasEncryptedFields = true;
    }
    processedData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    
    // Update the document in Firestore
    await firebase.firestore().collection(collection).doc(docId).update(processedData);
    return true;
  } catch (error) {
    console.error("Error updating encrypted document:", error);
    throw error;
  }
};

/**
 * Get a document with encrypted fields from Firestore and decrypt them
 * 
 * @param {String} collection - The collection containing the document
 * @param {String} docId - The ID of the document to get
 * @param {String} userId - The user's ID
 * @returns {Object} The document data with decrypted fields
 */
export const getEncryptedDocument = async (collection, docId, userId) => {
  try {
    // Get the document from Firestore
    const docSnapshot = await firebase.firestore().collection(collection).doc(docId).get();
    
    if (!docSnapshot.exists) {
      return null;
    }
    
    // Get the document data
    const data = docSnapshot.data();
    
    // Check if the document has encrypted fields
    if (!data.hasEncryptedFields) {
      return { id: docId, ...data };
    }
    
    // Clone the data to avoid modifying the original
    const processedData = { ...data };
    
    // Decrypt encrypted fields
    for (const field of Object.keys(processedData)) {
      if (field.endsWith('_encrypted') && processedData[field] === true) {
        const actualField = field.replace('_encrypted', '');
        if (processedData[actualField]) {
          processedData[actualField] = await decryptData(processedData[actualField], userId);
        }
      }
    }
    
    return { id: docId, ...processedData };
  } catch (error) {
    console.error("Error getting encrypted document:", error);
    throw error;
  }
};

/**
 * Get multiple documents with encrypted fields from Firestore and decrypt them
 * 
 * @param {String} collection - The collection to query
 * @param {Function} queryBuilder - Function to build the query
 * @param {String} userId - The user's ID
 * @returns {Array} Array of documents with decrypted fields
 */
export const queryEncryptedDocuments = async (collection, queryBuilder, userId) => {
  try {
    // Build the query
    const query = queryBuilder(firebase.firestore().collection(collection));
    
    // Execute the query
    const querySnapshot = await query.get();
    
    // Process each document
    const documents = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Clone the data to avoid modifying the original
      const processedData = { ...data };
      
      // Decrypt encrypted fields if any
      if (data.hasEncryptedFields) {
        for (const field of Object.keys(processedData)) {
          if (field.endsWith('_encrypted') && processedData[field] === true) {
            const actualField = field.replace('_encrypted', '');
            if (processedData[actualField]) {
              processedData[actualField] = await decryptData(processedData[actualField], userId);
            }
          }
        }
      }
      
      documents.push({
        id: docSnapshot.id,
        ...processedData
      });
    }
    
    return documents;
  } catch (error) {
    console.error("Error querying encrypted documents:", error);
    throw error;
  }
};
