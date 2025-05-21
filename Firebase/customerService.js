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
const CUSTOMERS_COLLECTION = 'customers';
const TRANSACTIONS_SUBCOLLECTION = 'transactions';

// Get current user ID
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found');
  return user.uid;
};

// Create a new customer
export const addCustomer = async (customerData) => {
  try {
    const userId = getCurrentUserId();
    
    // Add customer to Firestore
    const docRef = await addDoc(collection(db, `users/${userId}/${CUSTOMERS_COLLECTION}`), {
      ...customerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error adding customer:', error);
    return { id: null, error: error.message };
  }
};

// Get all customers
export const getCustomers = async () => {
  try {
    const userId = getCurrentUserId();
    const customersRef = collection(db, `users/${userId}/${CUSTOMERS_COLLECTION}`);
    const querySnapshot = await getDocs(customersRef);
    
    const customers = [];
    querySnapshot.forEach((doc) => {
      customers.push({ id: doc.id, ...doc.data() });
    });
    
    return { data: customers, error: null };
  } catch (error) {
    console.error('Error getting customers:', error);
    return { data: [], error: error.message };
  }
};

// Get a specific customer by ID
export const getCustomer = async (customerId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, `users/${userId}/${CUSTOMERS_COLLECTION}`, customerId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: 'Customer not found' };
    }
  } catch (error) {
    console.error('Error getting customer:', error);
    return { data: null, error: error.message };
  }
};

// Update a customer
export const updateCustomer = async (customerId, customerData) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, `users/${userId}/${CUSTOMERS_COLLECTION}`, customerId);
    
    await updateDoc(docRef, {
      ...customerData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: error.message };
  }
};

// Delete a customer
export const deleteCustomer = async (customerId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, `users/${userId}/${CUSTOMERS_COLLECTION}`, customerId);
    
    await deleteDoc(docRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: error.message };
  }
};

// Add a transaction to a customer
export const addCustomerTransaction = async (customerId, transactionData) => {
  try {
    const userId = getCurrentUserId();
    const transactionsRef = collection(
      db, 
      `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`
    );
    
    // Calculate total amount from items
    const totalItemsAmount = transactionData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price), 
      0
    );
    
    // Use provided material amount or calculated amount
    const materialAmount = transactionData.material_amount || totalItemsAmount;
    
    // Calculate total payments
    const totalPayments = transactionData.payments.reduce(
      (sum, payment) => sum + payment.amount, 
      0
    );
    
    // Calculate outstanding amount
    const outstandingAmount = materialAmount - totalPayments;
    
    // Add transaction with timestamps
    const docRef = await addDoc(transactionsRef, {
      ...transactionData,
      material_amount: materialAmount,
      total_amount: materialAmount,
      total_payments: totalPayments,
      outstanding_amount: outstandingAmount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error('Error adding customer transaction:', error);
    return { id: null, error: error.message };
  }
};

// Get all transactions for a customer
export const getCustomerTransactions = async (customerId) => {
  try {
    const userId = getCurrentUserId();
    const transactionsRef = collection(
      db, 
      `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`
    );
    
    const q = query(transactionsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    
    return { data: transactions, error: null };
  } catch (error) {
    console.error('Error getting customer transactions:', error);
    return { data: [], error: error.message };
  }
};

// Add a payment to a customer transaction
export const addPaymentToTransaction = async (customerId, transactionId, paymentData) => {
  try {
    const userId = getCurrentUserId();
    const transactionRef = doc(
      db, 
      `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}/${transactionId}`
    );
    
    // Get current transaction data
    const transactionSnap = await getDoc(transactionRef);
    if (!transactionSnap.exists()) {
      return { success: false, error: 'Transaction not found' };
    }
    
    const transaction = transactionSnap.data();
    const currentPayments = transaction.payments || [];
    const updatedPayments = [...currentPayments, {
      ...paymentData,
      date: paymentData.date || new Date().toISOString().split('T')[0]
      // Removed serverTimestamp as it's not supported in arrays
    }];
    
    // Calculate new total payments
    const totalPayments = updatedPayments.reduce(
      (sum, payment) => sum + payment.amount, 
      0
    );
    
    // Calculate new outstanding amount
    const outstandingAmount = transaction.material_amount - totalPayments;
    
    // Update the transaction
    await updateDoc(transactionRef, {
      payments: updatedPayments,
      total_payments: totalPayments,
      outstanding_amount: outstandingAmount,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error adding payment to transaction:', error);
    return { success: false, error: error.message };
  }
};

// Get customer outstanding balance
export const getCustomerOutstandingBalance = async () => {
  try {
    const userId = getCurrentUserId();
    const customersRef = collection(db, `users/${userId}/${CUSTOMERS_COLLECTION}`);
    const customersSnapshot = await getDocs(customersRef);
    
    let totalOutstanding = 0;
    
    // For each customer, get their transactions
    for (const customerDoc of customersSnapshot.docs) {
      const customerId = customerDoc.id;
      const transactionsRef = collection(
        db, 
        `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`
      );
      
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      // Sum up all transaction outstanding amounts
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        totalOutstanding += transaction.outstanding_amount || 0;
      });
    }
    
    return { data: totalOutstanding, error: null };
  } catch (error) {
    console.error('Error calculating customer outstanding balance:', error);
    return { data: 0, error: error.message };
  }
};

// Get a specific transaction for a customer
export const getCustomerTransaction = async (customerId, transactionId) => {
  try {
    const userId = getCurrentUserId();
    const transactionRef = doc(
      db, 
      `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}/${transactionId}`
    );
    
    const transactionSnap = await getDoc(transactionRef);
    
    if (transactionSnap.exists()) {
      return { data: { id: transactionSnap.id, ...transactionSnap.data() }, error: null };
    } else {
      return { data: null, error: 'Transaction not found' };
    }
  } catch (error) {
    console.error('Error getting customer transaction:', error);
    return { data: null, error: error.message };
  }
};

// Update a customer transaction
export const updateCustomerTransaction = async (customerId, transactionId, transactionData) => {
  try {
    const userId = getCurrentUserId();
    const transactionRef = doc(
      db, 
      `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}/${transactionId}`
    );
    
    // Get the current transaction to preserve payments if not provided
    const currentTransactionSnap = await getDoc(transactionRef);
    if (!currentTransactionSnap.exists()) {
      return { success: false, error: 'Transaction not found' };
    }
    
    const currentTransaction = currentTransactionSnap.data();
    
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
    } else if (materialAmount === undefined) {
      materialAmount = currentTransaction.material_amount;
    }
    
    // Use provided payments or keep existing
    const payments = transactionData.payments || currentTransaction.payments || [];
    
    // Calculate total payments
    const totalPayments = payments.reduce(
      (sum, payment) => sum + payment.amount, 
      0
    );
    
    // Calculate outstanding amount
    const outstandingAmount = materialAmount - totalPayments;
    
    // Prepare update data
    const updateData = {
      ...transactionData,
      material_amount: materialAmount,
      payments: payments,
      total_payments: totalPayments,
      outstanding_amount: outstandingAmount,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(transactionRef, updateData);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating customer transaction:', error);
    return { success: false, error: error.message };
  }
};

// Delete a customer transaction
export const deleteCustomerTransaction = async (customerId, transactionId) => {
  try {
    const userId = getCurrentUserId();
    const transactionRef = doc(
      db, 
      `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}/${transactionId}`
    );
    
    await deleteDoc(transactionRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting customer transaction:', error);
    return { success: false, error: error.message };
  }
};

// Get individual customer outstanding balance
export const getSingleCustomerOutstandingBalance = async (customerId) => {
  try {
    const userId = getCurrentUserId();
    const transactionsRef = collection(
      db, 
      `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`
    );
    
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    let customerOutstanding = 0;
    
    // Sum up all transaction outstanding amounts
    transactionsSnapshot.forEach((transactionDoc) => {
      const transaction = transactionDoc.data();
      customerOutstanding += transaction.outstanding_amount || 0;
    });
    
    return { data: customerOutstanding, error: null };
  } catch (error) {
    console.error(`Error calculating outstanding balance for customer ${customerId}:`, error);
    return { data: 0, error: error.message };
  }
};

// Search customers by name
export const searchCustomers = async (searchTerm) => {
  try {
    const userId = getCurrentUserId();
    const customersRef = collection(db, `users/${userId}/${CUSTOMERS_COLLECTION}`);
    
    // Get all customers (Firestore doesn't support direct text search)
    const querySnapshot = await getDocs(customersRef);
    
    const customers = [];
    querySnapshot.forEach((doc) => {
      const customerData = doc.data();
      // Filter customers whose name contains the search term (case insensitive)
      if (customerData.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        customers.push({ id: doc.id, ...customerData });
      }
    });
    
    return { data: customers, error: null };
  } catch (error) {
    console.error('Error searching customers:', error);
    return { data: [], error: error.message };
  }
};
