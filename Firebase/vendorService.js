import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from './config';

// Collection names
const VENDORS_COLLECTION = 'vendors';
const TRANSACTIONS_SUBCOLLECTION = 'transactions';

// Get current user ID
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found');
  return user.uid;
};

// Create a new vendor
export const addVendor = async (vendorData) => {
  try {
    const userId = getCurrentUserId();
    
    // Add vendor to Firestore
    const docRef = await addDoc(collection(db, `users/${userId}/${VENDORS_COLLECTION}`), {
      ...vendorData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error adding vendor:', error);
    return { id: null, error: error.message };
  }
};

// Get all vendors
export const getVendors = async () => {
  try {
    const userId = getCurrentUserId();
    const vendorsRef = collection(db, `users/${userId}/${VENDORS_COLLECTION}`);
    const querySnapshot = await getDocs(vendorsRef);
    
    const vendors = [];
    querySnapshot.forEach((doc) => {
      vendors.push({ id: doc.id, ...doc.data() });
    });
    
    return { data: vendors, error: null };
  } catch (error) {
    console.error('Error getting vendors:', error);
    return { data: [], error: error.message };
  }
};

// Get a specific vendor by ID
export const getVendor = async (vendorId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, `users/${userId}/${VENDORS_COLLECTION}`, vendorId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: 'Vendor not found' };
    }
  } catch (error) {
    console.error('Error getting vendor:', error);
    return { data: null, error: error.message };
  }
};

// Update a vendor
export const updateVendor = async (vendorId, vendorData) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, `users/${userId}/${VENDORS_COLLECTION}`, vendorId);
    
    await updateDoc(docRef, {
      ...vendorData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating vendor:', error);
    return { success: false, error: error.message };
  }
};

// Delete a vendor
export const deleteVendor = async (vendorId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, `users/${userId}/${VENDORS_COLLECTION}`, vendorId);
    
    await deleteDoc(docRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return { success: false, error: error.message };
  }
};

// Add a transaction to a vendor
export const addVendorTransaction = async (vendorId, transactionData) => {
  try {
    const userId = getCurrentUserId();
    const transactionsRef = collection(
      db, 
      `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`
    );
    
    // Calculate total amount from items
    const totalItemsAmount = transactionData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price), 
      0
    );
    
    // Use provided material amount or calculated amount
    const materialAmount = transactionData.material_amount || totalItemsAmount;
    
    // Add transaction with timestamps
    const docRef = await addDoc(transactionsRef, {
      ...transactionData,
      material_amount: materialAmount,
      total_amount: materialAmount + (transactionData.transport_charge || 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error adding vendor transaction:', error);
    return { id: null, error: error.message };
  }
};

// Get all transactions for a vendor
export const getVendorTransactions = async (vendorId) => {
  try {
    const userId = getCurrentUserId();
    const transactionsRef = collection(
      db, 
      `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`
    );
    
    const q = query(transactionsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    
    return { data: transactions, error: null };
  } catch (error) {
    console.error('Error getting vendor transactions:', error);
    return { data: [], error: error.message };
  }
};

// Get vendor outstanding balance
export const getVendorOutstandingBalance = async () => {
  try {
    const userId = getCurrentUserId();
    const vendorsRef = collection(db, `users/${userId}/${VENDORS_COLLECTION}`);
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    let totalOutstanding = 0;
    
    // For each vendor, get their transactions
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const transactionsRef = collection(
        db, 
        `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`
      );
      
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      let vendorTotal = 0;
      
      // Sum up all transaction amounts
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        vendorTotal += transaction.total_amount || 0;
      });
      
      // Get vendor payments
      const paymentsRef = query(
        collection(db, `users/${userId}/vendor_payments`),
        where('vendor_id', '==', vendorId)
      );
      
      const paymentsSnapshot = await getDocs(paymentsRef);
      
      // Subtract payments from the total
      paymentsSnapshot.forEach((paymentDoc) => {
        const payment = paymentDoc.data();
        vendorTotal -= payment.amount || 0;
      });
      
      // Add this vendor's outstanding balance to the total
      totalOutstanding += vendorTotal > 0 ? vendorTotal : 0;
    }
    
    return { data: totalOutstanding, error: null };
  } catch (error) {
    console.error('Error calculating vendor outstanding balance:', error);
    return { data: 0, error: error.message };
  }
};

// Get individual vendor outstanding balance
export const getSingleVendorOutstandingBalance = async (vendorId) => {
  try {
    const userId = getCurrentUserId();
    const transactionsRef = collection(
      db, 
      `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`
    );
    
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    let vendorOutstanding = 0;
    
    // Sum up all transaction amounts
    transactionsSnapshot.forEach((transactionDoc) => {
      const transaction = transactionDoc.data();
      vendorOutstanding += transaction.total_amount || 0;
    });
    
    return { data: vendorOutstanding, error: null };
  } catch (error) {
    console.error(`Error calculating outstanding balance for vendor ${vendorId}:`, error);
    return { data: 0, error: error.message };
  }
};

// Get a specific transaction for a vendor
export const getVendorTransaction = async (vendorId, transactionId) => {
  try {
    const userId = getCurrentUserId();
    const transactionRef = doc(
      db, 
      `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}/${transactionId}`
    );
    
    const transactionSnap = await getDoc(transactionRef);
    
    if (transactionSnap.exists()) {
      return { data: { id: transactionSnap.id, ...transactionSnap.data() }, error: null };
    } else {
      return { data: null, error: 'Transaction not found' };
    }
  } catch (error) {
    console.error('Error getting vendor transaction:', error);
    return { data: null, error: error.message };
  }
};

// Update a vendor transaction
export const updateVendorTransaction = async (vendorId, transactionId, transactionData) => {
  try {
    const userId = getCurrentUserId();
    const transactionRef = doc(
      db, 
      `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}/${transactionId}`
    );
    
    // Calculate total amount from items if items are provided
    let totalItemsAmount = 0;
    if (transactionData.items && Array.isArray(transactionData.items)) {
      totalItemsAmount = transactionData.items.reduce(
        (sum, item) => sum + (item.quantity * item.unit_price), 
        0
      );
    }
    
    // Use provided material amount, or calculated amount, or keep existing
    let materialAmount = transactionData.material_amount;
    if (materialAmount === undefined && transactionData.items) {
      materialAmount = totalItemsAmount;
    }
    
    // Only include material_amount and total_amount in the update if they're defined
    const updateData = {
      ...transactionData,
      updatedAt: serverTimestamp()
    };
    
    if (materialAmount !== undefined) {
      updateData.material_amount = materialAmount;
      // Calculate total amount if transport charge is provided or exists in the update data
      if (transactionData.transport_charge !== undefined) {
        updateData.total_amount = materialAmount + transactionData.transport_charge;
      }
    }
    
    await updateDoc(transactionRef, updateData);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating vendor transaction:', error);
    return { success: false, error: error.message };
  }
};

// Delete a vendor transaction
export const deleteVendorTransaction = async (vendorId, transactionId) => {
  try {
    const userId = getCurrentUserId();
    const transactionRef = doc(
      db, 
      `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}/${transactionId}`
    );
    
    await deleteDoc(transactionRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting vendor transaction:', error);
    return { success: false, error: error.message };
  }
};

// Search vendors by name
export const searchVendors = async (searchTerm) => {
  try {
    const userId = getCurrentUserId();
    const vendorsRef = collection(db, `users/${userId}/${VENDORS_COLLECTION}`);
    
    // Get all vendors (Firestore doesn't support direct text search)
    const querySnapshot = await getDocs(vendorsRef);
    
    const vendors = [];
    querySnapshot.forEach((doc) => {
      const vendorData = doc.data();
      // Filter vendors whose name contains the search term (case insensitive)
      if (vendorData.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        vendors.push({ id: doc.id, ...vendorData });
      }
    });
    
    return { data: vendors, error: null };
  } catch (error) {
    console.error('Error searching vendors:', error);
    return { data: [], error: error.message };
  }
};
