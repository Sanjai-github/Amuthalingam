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
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './config';
import { getVendorOutstandingBalance } from './vendorService';
import { getCustomerOutstandingBalance } from './customerService';

// Collection names
const VENDORS_COLLECTION = 'vendors';
const CUSTOMERS_COLLECTION = 'customers';
const TRANSACTIONS_SUBCOLLECTION = 'transactions';
const SUMMARIES_COLLECTION = 'summaries';
const VENDOR_PAYMENTS_COLLECTION = 'vendor_payments';

// Default empty summary structure
const DEFAULT_MONTHLY_SUMMARY = {
  monthly_income: 0,
  monthly_expenses: 0,
  monthly_net_balance: 0,
  vendor_transaction_count: 0,
  customer_transaction_count: 0,
  vendor_payment_count: 0,
  customer_payment_count: 0,
  top_vendors: [],
  top_customers: []
};

/**
 * Get current user ID
 * @returns {string} User ID or 'default' if no user is authenticated
 */
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    console.warn('No authenticated user found, using default path');
    return 'default';
  }
  return user.uid;
};

/**
 * Calculate monthly summary (income, expenses, net balance)
 * @param {number} year - Year to calculate summary for
 * @param {number} month - Month to calculate summary for (1-12)
 * @returns {Promise<Object>} Monthly summary data or error
 */
export const calculateMonthlySummary = async (year, month) => {
  try {
    const userId = getCurrentUserId();
    
    // Format month to ensure it's two digits
    const formattedMonth = month.toString().padStart(2, '0');
    
    // Start and end date for the month
    const startDate = `${year}-${formattedMonth}-01`;
    
    // Get the last day of the month
    // Note: month parameter in Date constructor is 0-indexed, so we pass month-1
    const lastDay = new Date(year, parseInt(formattedMonth) - 1 + 1, 0).getDate();
    const endDate = `${year}-${formattedMonth}-${lastDay}`;
    
    // Initialize summary data
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let vendorTransactionCount = 0;
    let customerTransactionCount = 0;
    let vendorPaymentCount = 0;
    let customerPaymentCount = 0;
    let topVendors = [];
    let topCustomers = [];
    
    // Calculate vendor expenses for the month
    // Check if we should use the users collection path or not
    const vendorsPath = userId === 'default' ? VENDORS_COLLECTION : `users/${userId}/${VENDORS_COLLECTION}`;
    const vendorsRef = collection(db, vendorsPath);
    const vendorsSnapshot = await getDocs(vendorsRef);
    
    // Track vendor spending for top vendors calculation
    const vendorSpending = {};
    
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorName = vendorDoc.data().name || 'Unknown Vendor';
      const transactionsPath = userId === 'default' 
        ? `${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`
        : `users/${userId}/${VENDORS_COLLECTION}/${vendorId}/${TRANSACTIONS_SUBCOLLECTION}`;
      
      const transactionsRef = collection(db, transactionsPath);
      
      // Query transactions for the specific month
      const q = query(
        transactionsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const transactionsSnapshot = await getDocs(q);
      let vendorTotal = 0;
      
      // Sum up all transaction amounts
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        const amount = transaction.total_amount || 0;
        monthlyExpenses += amount;
        vendorTotal += amount;
        vendorTransactionCount++;
      });
      
      // Track this vendor's spending if they had transactions this month
      if (vendorTotal > 0) {
        vendorSpending[vendorId] = {
          id: vendorId,
          name: vendorName,
          amount: vendorTotal
        };
      }
      
      // Check for vendor payments in this month
      const vendorPaymentsPath = userId === 'default' 
        ? VENDOR_PAYMENTS_COLLECTION 
        : `users/${userId}/${VENDOR_PAYMENTS_COLLECTION}`;
      
      try {
        // First query with just the vendor_id filter
        const paymentsQuery = query(
          collection(db, vendorPaymentsPath),
          where('vendor_id', '==', vendorId)
        );
        
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        // Then filter the results in memory for the date range
        paymentsSnapshot.forEach((doc) => {
          const payment = doc.data();
          const paymentDate = payment.date;
          
          // Check if the payment date is within our target month
          if (paymentDate >= startDate && paymentDate <= endDate) {
            vendorPaymentCount++;
          }
        });
      } catch (error) {
        console.error(`Error fetching payments for vendor ${vendorId}:`, error);
        // Continue processing other vendors even if one fails
      }
    }
    
    // Calculate customer income for the month
    const customersPath = userId === 'default' ? CUSTOMERS_COLLECTION : `users/${userId}/${CUSTOMERS_COLLECTION}`;
    const customersRef = collection(db, customersPath);
    const customersSnapshot = await getDocs(customersRef);
    
    // Track customer revenue for top customers calculation
    const customerRevenue = {};
    
    for (const customerDoc of customersSnapshot.docs) {
      const customerId = customerDoc.id;
      const customerName = customerDoc.data().name || 'Unknown Customer';
      const transactionsPath = userId === 'default' 
        ? `${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`
        : `users/${userId}/${CUSTOMERS_COLLECTION}/${customerId}/${TRANSACTIONS_SUBCOLLECTION}`;
      
      const transactionsRef = collection(db, transactionsPath);
      
      // Query transactions for the specific month
      const q = query(
        transactionsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const transactionsSnapshot = await getDocs(q);
      customerTransactionCount += transactionsSnapshot.size;
      
      let customerTotal = 0;
      
      // Sum up all payments made in this month
      transactionsSnapshot.forEach((transactionDoc) => {
        const transaction = transactionDoc.data();
        if (transaction.payments && Array.isArray(transaction.payments)) {
          transaction.payments.forEach(payment => {
            // Check if payment date is within the month
            if (payment.date >= startDate && payment.date <= endDate) {
              const amount = payment.amount || 0;
              monthlyIncome += amount;
              customerTotal += amount;
              customerPaymentCount++;
            }
          });
        }
      });
      
      // Track this customer's revenue if they made payments this month
      if (customerTotal > 0) {
        customerRevenue[customerId] = {
          id: customerId,
          name: customerName,
          amount: customerTotal
        };
      }
    }
    
    // Get top 3 vendors by spending
    topVendors = Object.values(vendorSpending)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    
    // Get top 3 customers by revenue
    topCustomers = Object.values(customerRevenue)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    
    // Calculate net balance
    const netBalance = monthlyIncome - monthlyExpenses;
    
    // Store the summary in Firestore
    const summaryPath = userId === 'default' 
      ? SUMMARIES_COLLECTION 
      : `users/${userId}/${SUMMARIES_COLLECTION}`;
    
    const summaryRef = doc(db, summaryPath, `${year}_${formattedMonth}`);
    
    await setDoc(summaryRef, {
      year,
      month: parseInt(formattedMonth),
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      net_balance: netBalance,
      vendor_transaction_count: vendorTransactionCount,
      customer_transaction_count: customerTransactionCount,
      vendor_payment_count: vendorPaymentCount,
      customer_payment_count: customerPaymentCount,
      top_vendors: topVendors,
      top_customers: topCustomers,
      updated_at: serverTimestamp()
    });
    
    return {
      data: {
        year,
        month: parseInt(formattedMonth),
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        net_balance: netBalance,
        vendor_transaction_count: vendorTransactionCount,
        customer_transaction_count: customerTransactionCount,
        vendor_payment_count: vendorPaymentCount,
        customer_payment_count: customerPaymentCount,
        top_vendors: topVendors,
        top_customers: topCustomers
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
    // First check if we have a cached summary
    const userId = getCurrentUserId();
    const summaryId = `${year}_${month.toString().padStart(2, '0')}`;
    const summaryRef = doc(db, `users/${userId}/${SUMMARIES_COLLECTION}`, summaryId);

    try {
      const summaryDoc = await getDoc(summaryRef);

      if (summaryDoc.exists()) {
        return { data: summaryDoc.data(), error: null };
      }
    } catch (docError) {
      console.warn('Error fetching cached summary, will calculate fresh:', docError);
      // Continue to calculate a fresh summary
    }

    // If no cached summary or error fetching it, calculate it
    const result = await calculateMonthlySummary(year, month);

    // If calculation failed, return a default structure to avoid UI errors
    if (result.error || !result.data) {
      console.error('Error calculating monthly summary:', result.error);
      return { 
        data: { 
          ...DEFAULT_MONTHLY_SUMMARY,
          year,
          month
        }, 
        error: result.error 
      };
    }

    return result;
  } catch (error) {
    console.error('Error in getMonthlySummary:', error);
    // Return default structure to avoid UI errors
    return { 
      data: { 
        ...DEFAULT_MONTHLY_SUMMARY,
        year,
        month
      }, 
      error: error.message 
    };
  }
};

/**
 * Get current month summary
 * @returns {Promise<Object>} Current month's summary data or error
 */
export const getCurrentMonthlySummary = async () => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // JavaScript months are 0-indexed

    return await getMonthlySummary(year, month);
  } catch (error) {
    console.error('Error getting current monthly summary:', error);
    // Return default structure to avoid UI errors
    const today = new Date();
    return { 
      data: { 
        ...DEFAULT_MONTHLY_SUMMARY,
        year: today.getFullYear(),
        month: today.getMonth() + 1
      }, 
      error: error.message 
    };
  }
};

/**
 * Get home screen summary data (vendor balance, customer balance, monthly summary)
 * @returns {Promise<Object>} Combined summary data for home screen or error
 */
export const getHomeSummary = async () => {
  try {
    // Get vendor outstanding balance
    const vendorResult = await getVendorOutstandingBalance();
    const vendorBalance = vendorResult.error ? 0 : vendorResult.data;

    // Get customer outstanding balance
    const customerResult = await getCustomerOutstandingBalance();
    const customerBalance = customerResult.error ? 0 : customerResult.data;

    // Get current month summary
    const summaryResult = await getCurrentMonthlySummary();
    const monthlySummary = summaryResult.error ? DEFAULT_MONTHLY_SUMMARY : summaryResult.data;

    return {
      data: {
        vendor_balance: vendorBalance,
        customer_balance: customerBalance,
        monthly_summary: monthlySummary
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting home summary:', error);
    // Return default structure to avoid UI errors
    const today = new Date();
    return { 
      data: {
        vendor_balance: 0,
        customer_balance: 0,
        monthly_summary: {
          ...DEFAULT_MONTHLY_SUMMARY,
          year: today.getFullYear(),
          month: today.getMonth() + 1
        }
      }, 
      error: error.message 
    };
  }
};

/**
 * Get yearly summary
 * @param {number} year - Year to get summary for
 * @returns {Promise<Object>} Yearly summary with monthly breakdown or error
 */
export const getYearlySummary = async (year) => {
  try {
    const monthlyData = [];
    let yearlyIncome = 0;
    let yearlyExpenses = 0;

    // Calculate summary for each month
    for (let month = 1; month <= 12; month++) {
      try {
        const result = await getMonthlySummary(year, month);

        if (result.error) {
          console.warn(`Error getting summary for ${year}-${month}:`, result.error);
          // Use zeros for months with errors
          monthlyData.push({
            month,
            income: 0,
            expenses: 0,
            net_balance: 0
          });
          continue;
        }

        const monthSummary = result.data;
        const monthIncome = monthSummary.monthly_income || 0;
        const monthExpenses = monthSummary.monthly_expenses || 0;
        const monthNetBalance = monthIncome - monthExpenses;

        yearlyIncome += monthIncome;
        yearlyExpenses += monthExpenses;

        monthlyData.push({
          month,
          income: monthIncome,
          expenses: monthExpenses,
          net_balance: monthNetBalance
        });
      } catch (monthError) {
        console.error(`Error processing month ${year}-${month}:`, monthError);
        // Add zeros for this month and continue with the next
        monthlyData.push({
          month,
          income: 0,
          expenses: 0,
          net_balance: 0
        });
      }
    }

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
    // Return default structure to avoid UI errors
    return { 
      data: {
        year,
        yearly_income: 0,
        yearly_expenses: 0,
        yearly_net_balance: 0,
        monthly_breakdown: Array(12).fill(0).map((_, index) => ({
          month: index + 1,
          income: 0,
          expenses: 0,
          net_balance: 0
        }))
      }, 
      error: error.message 
    };
  }
};

/**
 * Get transaction history for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Transaction history or error
 */
/**
 * Subscribe to monthly summary updates for a specific month
 * @param {number} year - Year to get summary for
 * @param {number} month - Month to get summary for (1-12)
 * @param {Function} callback - Callback function to receive updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeMonthlySummary = (year, month, callback) => {
  try {
    const userId = getCurrentUserId();
    
    // Format month to ensure it's two digits
    const formattedMonth = month.toString().padStart(2, '0');
    
    // Document ID for the monthly summary
    const summaryId = `${year}_${formattedMonth}`;
    
    // Get reference to the summary document
    const summaryPath = userId === 'default' 
      ? `${SUMMARIES_COLLECTION}/${summaryId}`
      : `users/${userId}/${SUMMARIES_COLLECTION}/${summaryId}`;
    const summaryRef = doc(db, summaryPath);
    
    // Setup real-time listener
    const unsubscribe = onSnapshot(summaryRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const summaryData = docSnapshot.data();
        callback(summaryData);
      } else {
        // Document doesn't exist yet, return default values
        callback({
          ...DEFAULT_MONTHLY_SUMMARY,
          year,
          month
        });
      }
    }, (error) => {
      console.error('Error subscribing to monthly summary:', error);
      // Return default values on error
      callback({
        ...DEFAULT_MONTHLY_SUMMARY,
        year,
        month
      });
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up monthly summary subscription:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

export const getTransactionHistory = async (startDate, endDate) => {
  try {
    const userId = getCurrentUserId();
    const vendorTransactions = [];
    const customerTransactions = [];
    
    // Get vendor transactions
    try {
      const vendorsRef = collection(db, `users/${userId}/${VENDORS_COLLECTION}`);
      const vendorsSnapshot = await getDocs(vendorsRef);
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        try {
          const vendorId = vendorDoc.id;
          const vendorName = vendorDoc.data().name || 'Unknown Vendor';
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
        } catch (vendorError) {
          console.error(`Error processing vendor ${vendorDoc.id}:`, vendorError);
          // Continue with next vendor
        }
      }
    } catch (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      // Continue with customer transactions
    }
    
    // Get customer transactions
    try {
      const customersRef = collection(db, `users/${userId}/${CUSTOMERS_COLLECTION}`);
      const customersSnapshot = await getDocs(customersRef);
      
      for (const customerDoc of customersSnapshot.docs) {
        try {
          const customerId = customerDoc.id;
          const customerName = customerDoc.data().name || 'Unknown Customer';
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
        } catch (customerError) {
          console.error(`Error processing customer ${customerDoc.id}:`, customerError);
          // Continue with next customer
        }
      }
    } catch (customersError) {
      console.error('Error fetching customers:', customersError);
      // Continue with combining results
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
