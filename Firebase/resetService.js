import { db, auth } from './config';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  writeBatch
} from 'firebase/firestore';

/**
 * Get current user ID
 * @returns {string} User ID
 */
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found');
  return user.uid;
};

/**
 * Reset all user data by deleting all documents in all collections
 * @returns {Promise<Object>} Response with success status and message
 */
export const resetAllData = async () => {
  try {
    const userId = getCurrentUserId();
    const batch = writeBatch(db);
    let deletedCount = 0;
    
    // Collections to reset
    const collections = [
      'vendors',
      'customers',
      'vendor_payments',
      'settings'
    ];
    
    // Process each collection
    for (const collectionName of collections) {
      const collectionPath = `users/${userId}/${collectionName}`;
      const collectionRef = collection(db, collectionPath);
      const querySnapshot = await getDocs(collectionRef);
      
      // Add delete operations to batch
      querySnapshot.forEach((docSnapshot) => {
        batch.delete(doc(db, collectionPath, docSnapshot.id));
        deletedCount++;
      });
      
      // For vendors and customers, also delete their subcollections
      if (collectionName === 'vendors' || collectionName === 'customers') {
        const entities = querySnapshot.docs;
        
        for (const entity of entities) {
          const entityId = entity.id;
          const transactionsPath = `users/${userId}/${collectionName}/${entityId}/transactions`;
          const transactionsRef = collection(db, transactionsPath);
          const transactionsSnapshot = await getDocs(transactionsRef);
          
          transactionsSnapshot.forEach((transactionDoc) => {
            batch.delete(doc(db, transactionsPath, transactionDoc.id));
            deletedCount++;
          });
        }
      }
    }
    
    // Commit all the delete operations
    await batch.commit();
    
    return {
      success: true,
      message: `Successfully reset all data. Deleted ${deletedCount} documents.`
    };
  } catch (error) {
    console.error('Error resetting data:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Reset specific collection data
 * @param {string} collectionName - Name of the collection to reset
 * @returns {Promise<Object>} Response with success status and message
 */
export const resetCollectionData = async (collectionName) => {
  try {
    const userId = getCurrentUserId();
    const batch = writeBatch(db);
    let deletedCount = 0;
    
    const collectionPath = `users/${userId}/${collectionName}`;
    const collectionRef = collection(db, collectionPath);
    const querySnapshot = await getDocs(collectionRef);
    
    // Add delete operations to batch
    querySnapshot.forEach((docSnapshot) => {
      batch.delete(doc(db, collectionPath, docSnapshot.id));
      deletedCount++;
    });
    
    // For vendors and customers, also delete their subcollections
    if (collectionName === 'vendors' || collectionName === 'customers') {
      const entities = querySnapshot.docs;
      
      for (const entity of entities) {
        const entityId = entity.id;
        const transactionsPath = `users/${userId}/${collectionName}/${entityId}/transactions`;
        const transactionsRef = collection(db, transactionsPath);
        const transactionsSnapshot = await getDocs(transactionsRef);
        
        transactionsSnapshot.forEach((transactionDoc) => {
          batch.delete(doc(db, transactionsPath, transactionDoc.id));
          deletedCount++;
        });
      }
    }
    
    // Commit all the delete operations
    await batch.commit();
    
    return {
      success: true,
      message: `Successfully reset ${collectionName} data. Deleted ${deletedCount} documents.`
    };
  } catch (error) {
    console.error(`Error resetting ${collectionName} data:`, error);
    return {
      success: false,
      message: error.message
    };
  }
};
