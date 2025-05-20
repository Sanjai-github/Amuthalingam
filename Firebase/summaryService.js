import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './config';
import { getVendorOutstandingBalance } from './vendorService';
import { getCustomerOutstandingBalance } from './customerService';

// Collection names
const VENDORS_COLLECTION = 'vendors';
const CUSTOMERS_COLLECTION = 'customers';
const TRANSACTIONS_SUBCOLLECTION = 'transactions';
const SUMMARIES_COLLECTION = 'summaries';

// Get current user ID
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found');
  return user.uid;
};

// Calculate monthly summary (income, expenses, net balance)
export const calculateMonthlySummary = async (year, month) => {
  try {
    const userId = getCurrentUserId();
    
    // Format month to ensure it's two digits
    const formattedMonth = month.toString().padStart(2, '0');
    
    // Start and end date for the month
    const startDate = `${year}-${formattedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${formattedMonth}-${lastDay}`;
    
    // Initialize summary data
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    
    // Calculate vendor expenses for the month
    const vendorsRef = collection(db, `users/${userId}/${VENDORS_COLLECTION}`);
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const transactionsRef = collection(
        db, 
        `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`
      );
      
      // Query transactions for the specific month
      const q = query(
        transactionsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const transactionsSnapshot = await getDocs(q);
      
      // Sum up all transaction amounts
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        monthlyExpenses += transaction.total_amount || 0;
      });
    }
    
    // Calculate customer income for the month
    const customersRef = collection(db, `users/${userId}/${CUSTOMERS_COLLECTION}`);
    const customersSnapshot = await getDocs(customersRef);
    
    for (const customerDoc of customersSnapshot.docs) {
      const customerId = customerDoc.id;
      const transactionsRef = collection(
        db, 
        `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`
      );
      
      // Query transactions for the specific month
      const q = query(
        transactionsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const transactionsSnapshot = await getDocs(q);
      
      // Sum up all payments made in this month
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        if (transaction.payments && Array.isArray(transaction.payments)) {
          transaction.payments.forEach(payment => {
            // Check if payment date is within the month
            if (payment.date >= startDate && payment.date <= endDate) {
              monthlyIncome += payment.amount || 0;
            }
          });
        }
      });
    }
    
    // Calculate net balance
    const netBalance = monthlyIncome - monthlyExpenses;
    
    // Store the summary in Firestore
    const summaryId = `${year}-${formattedMonth}`;
    const summaryRef = doc(db, `users/${userId}/${SUMMARIES_COLLECTION}`, summaryId);
    
    await setDoc(summaryRef, {
      year,
      month: parseInt(formattedMonth),
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      net_balance: netBalance,
      updatedAt: serverTimestamp()
    });
    
    return { 
      data: { 
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        net_balance: netBalance
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error calculating monthly summary:', error);
    return { data: null, error: error.message };
  }
};

// Get monthly summary for a specific month
export const getMonthlySummary = async (year, month) => {
  try {
    const userId = getCurrentUserId();
    
    // Format month to ensure it's two digits
    const formattedMonth = month.toString().padStart(2, '0');
    
    // Get the summary document
    const summaryId = `${year}-${formattedMonth}`;
    const summaryRef = doc(db, `users/${userId}/${SUMMARIES_COLLECTION}`, summaryId);
    const summarySnap = await getDoc(summaryRef);
    
    if (summarySnap.exists()) {
      return { data: summarySnap.data(), error: null };
    } else {
      // If summary doesn't exist, calculate it
      return await calculateMonthlySummary(year, month);
    }
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    return { data: null, error: error.message };
  }
};

// Get current month summary
export const getCurrentMonthlySummary = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  return await getMonthlySummary(year, month);
};

// Get home screen summary data (vendor balance, customer balance, monthly summary)
export const getHomeSummary = async () => {
  try {
    // Get vendor outstanding balance
    const vendorBalanceResult = await getVendorOutstandingBalance();
    if (vendorBalanceResult.error) {
      throw new Error(vendorBalanceResult.error);
    }
    
    // Get customer outstanding balance
    const customerBalanceResult = await getCustomerOutstandingBalance();
    if (customerBalanceResult.error) {
      throw new Error(customerBalanceResult.error);
    }
    
    // Get current month summary
    const monthlySummaryResult = await getCurrentMonthlySummary();
    if (monthlySummaryResult.error) {
      throw new Error(monthlySummaryResult.error);
    }
    
    return {
      data: {
        vendor_outstanding: vendorBalanceResult.data,
        customer_outstanding: customerBalanceResult.data,
        monthly_summary: monthlySummaryResult.data
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting home summary:', error);
    return { data: null, error: error.message };
  }
};

// Get yearly summary
export const getYearlySummary = async (year) => {
  try {
    const userId = getCurrentUserId();
    const summariesRef = collection(db, `users/${userId}/${SUMMARIES_COLLECTION}`);
    
    // Query all summaries for the specified year
    const q = query(
      summariesRef,
      where('year', '==', year),
      orderBy('month', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    // Initialize yearly totals
    let yearlyIncome = 0;
    let yearlyExpenses = 0;
    const monthlyData = [];
    
    // Process each month's data
    querySnapshot.forEach((doc) => {
      const monthData = doc.data();
      yearlyIncome += monthData.monthly_income || 0;
      yearlyExpenses += monthData.monthly_expenses || 0;
      
      monthlyData.push({
        month: monthData.month,
        income: monthData.monthly_income || 0,
        expenses: monthData.monthly_expenses || 0,
        net_balance: monthData.net_balance || 0
      });
    });
    
    // Calculate net balance for the year
    const yearlyNetBalance = yearlyIncome - yearlyExpenses;
    
    return {
      data: {
        year,
        yearly_income: yearlyIncome,
        yearly_expenses: yearlyExpenses,
        yearly_net_balance: yearlyNetBalance,
        monthly_breakdown: monthlyData
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting yearly summary:', error);
    return { data: null, error: error.message };
  }
};

// Get transaction history for a date range
export const getTransactionHistory = async (startDate, endDate) => {
  try {
    const userId = getCurrentUserId();
    
    // Get vendor transactions
    const vendorTransactions = [];
    const vendorsRef = collection(db, `users/${userId}/${VENDORS_COLLECTION}`);
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorName = vendorDoc.data().name;
      const transactionsRef = collection(
        db, 
        `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`
      );
      
      // Query transactions for the date range
      const q = query(
        transactionsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const transactionsSnapshot = await getDocs(q);
      
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        vendorTransactions.push({
          id: transactionDoc.id,
          vendor_id: vendorId,
          vendor_name: vendorName,
          type: 'expense',
          date: transaction.date,
          amount: transaction.total_amount || 0,
          ...transaction
        });
      });
    }
    
    // Get customer transactions
    const customerTransactions = [];
    const customersRef = collection(db, `users/${userId}/${CUSTOMERS_COLLECTION}`);
    const customersSnapshot = await getDocs(customersRef);
    
    for (const customerDoc of customersSnapshot.docs) {
      const customerId = customerDoc.id;
      const customerName = customerDoc.data().name;
      const transactionsRef = collection(
        db, 
        `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`
      );
      
      // Query transactions for the date range
      const q = query(
        transactionsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const transactionsSnapshot = await getDocs(q);
      
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        
        // For customer transactions, we need to handle payments separately
        if (transaction.payments && Array.isArray(transaction.payments)) {
          // Filter payments within the date range
          const paymentsInRange = transaction.payments.filter(
            payment => payment.date >= startDate && payment.date <= endDate
          );
          
          // Add each payment as a separate transaction entry
          paymentsInRange.forEach(payment => {
            customerTransactions.push({
              id: `${transactionDoc.id}_payment_${payment.date}`,
              customer_id: customerId,
              customer_name: customerName,
              type: 'income',
              date: payment.date,
              amount: payment.amount || 0,
              payment_for: transaction.date, // Reference to original transaction date
              transaction_id: transactionDoc.id
            });
          });
        }
      });
    }
    
    // Combine and sort all transactions by date
    const allTransactions = [...vendorTransactions, ...customerTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return { data: allTransactions, error: null };
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return { data: [], error: error.message };
  }
};
