import { db, auth } from './config';
import { collection, addDoc, getDocs, doc, getDoc, query, where, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';

// Get current user ID
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found');
  return user.uid;
};

/**
 * Add a new payment for a vendor
 * @param {Object} payment - Payment details (vendor_id, vendor_name, date, amount)
 * @returns {Promise<Object>} - Response with data or error
 */
export const addVendorPayment = async (payment) => {
  try {
    // Validate required fields
    if (!payment.vendor_id) throw new Error('Vendor ID is required');
    if (!payment.date) throw new Error('Payment date is required');
    if (!payment.amount || isNaN(payment.amount)) throw new Error('Valid payment amount is required');
    
    const userId = getCurrentUserId();
    
    const paymentData = {
      ...payment,
      user_id: userId,
      amount: Number(payment.amount), // Ensure amount is a number
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Add payment to vendor_payments collection
    const docRef = await addDoc(collection(db, `users/${userId}/vendor_payments`), paymentData);
    
    // Update vendor's last payment information
    const vendorRef = doc(db, `users/${userId}/vendors`, payment.vendor_id);
    const vendorDoc = await getDoc(vendorRef);
    
    if (vendorDoc.exists()) {
      await updateDoc(vendorRef, {
        last_payment_date: payment.date,
        last_payment_amount: Number(payment.amount),
        updatedAt: serverTimestamp()
      });
    }
    
    return {
      data: { id: docRef.id, ...paymentData },
      error: null
    };
  } catch (error) {
    console.error('Error adding vendor payment:', error);
    return {
      data: null,
      error: error.message
    };
  }
};

/**
 * Get all payments for a specific vendor
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} - Response with data or error
 */
export const getVendorPayments = async (vendorId) => {
  try {
    // Validate vendorId
    if (!vendorId) {
      return { data: [], error: 'Vendor ID is required' };
    }

    // Use the auth object imported from config
    const user = auth.currentUser;

    if (!user) {
      return { data: [], error: 'User not authenticated' };
    }

    const userId = user.uid;

    // Query payments for the specific vendor without using orderBy
    // This avoids the need for a composite index
    const q = query(
      collection(db, `users/${userId}/vendor_payments`),
      where('vendor_id', '==', vendorId)
    );

    const querySnapshot = await getDocs(q);
    const payments = [];

    querySnapshot.forEach((doc) => {
      // Ensure amount is a number
      const data = doc.data();
      const payment = {
        id: doc.id,
        ...data,
        amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0
      };
      payments.push(payment);
    });

    // Sort payments by date (newest first) in memory
    // This avoids the need for orderBy in the query
    payments.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    return { data: payments, error: null };
  } catch (error) {
    console.error('Error getting vendor payments:', error);
    return { data: [], error: error.message };
  }
};

/**
 * Calculate the remaining balance for a vendor
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} - Response with data or error
 */
export const getVendorRemainingBalance = async (vendorId) => {
  try {
    if (!vendorId) throw new Error('Vendor ID is required');
    
    const userId = getCurrentUserId();
    
    // Get vendor data including total spent from transactions
    const vendorRef = doc(db, `users/${userId}/vendors`, vendorId);
    const vendorDoc = await getDoc(vendorRef);
    
    if (!vendorDoc.exists()) {
      return {
        data: 0,
        error: 'Vendor not found'
      };
    }
    
    // Get total payments made to vendor
    const paymentsQuery = query(
      collection(db, `users/${userId}/vendor_payments`),
      where('vendor_id', '==', vendorId)
    );
    
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const totalPayments = paymentsSnapshot.docs.reduce(
      (sum, doc) => {
        const amount = doc.data().amount;
        return sum + (typeof amount === 'number' ? amount : Number(amount) || 0);
      }, 
      0
    );
    
    // Get all transactions to calculate total amount owed
    const transactionsRef = collection(db, `users/${userId}/vendors/${vendorId}/transactions`);
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    const totalOwed = transactionsSnapshot.docs.reduce(
      (sum, doc) => {
        const total = doc.data().total_amount;
        return sum + (typeof total === 'number' ? total : Number(total) || 0);
      },
      0
    );
    
    // Calculate remaining balance
    const remainingBalance = totalOwed - totalPayments;
    
    // Update vendor document with calculated values
    await updateDoc(vendorRef, {
      total_spent: totalOwed,
      total_paid: totalPayments,
      remaining_balance: remainingBalance,
      updatedAt: serverTimestamp()
    });
    
    return {
      data: remainingBalance,
      error: null
    };
  } catch (error) {
    console.error('Error calculating vendor remaining balance:', error);
    return {
      data: 0,
      error: error.message
    };
  }
};
