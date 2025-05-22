import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { getMonthlySummary } from './summaryService';
import { getVendors, getVendorTransactions } from './vendorService';
import { getCustomers, getCustomerTransactions } from './customerService';
import { getVendorPayments } from './vendorPaymentService';

/**
 * Generate and share a PDF report
 * @param {string} exportType - Type of report ('monthly', 'vendors', 'customers', 'all', 'overall', 'vendor_payments')
 * @param {string} currency - Currency symbol to use in the report
 * @param {function} setIsExporting - Function to update loading state
 * @param {function} setExportType - Function to update export type state
 * @param {string} timePeriod - Time period for the report ('monthly', 'quarterly', 'yearly')
 * @returns {Promise<void>}
 */
export const generateAndSharePDF = async (
  exportType, 
  currency = '₹',
  setIsExporting,
  setExportType,
  timePeriod = 'monthly'
) => {
  try {
    setIsExporting(true);
    setExportType(exportType);
    
    // 1. Fetch the required data based on exportType and timePeriod
    const { data, fileName } = await fetchReportData(exportType, timePeriod);
    
    if (!data) {
      throw new Error('No data available to export');
    }
    
    // 2. Generate PDF content
    const html = generatePdfContent(exportType, data, currency);
    
    // 3. Create PDF file using expo-print
    const { uri } = await Print.printToFileAsync({ html });
    
    // 4. Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      // 5. Share the PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PDF Report',
        UTI: 'com.adobe.pdf'
      });
      
      Alert.alert(
        "Success", 
        `${fileName.replace(/_/g, ' ')} created successfully!`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Error", 
        "Sharing is not available on this device",
        [{ text: "OK" }]
      );
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    Alert.alert(
      "Error", 
      `Failed to export data: ${error.message || 'Unknown error'}`,
      [{ text: "OK" }]
    );
  } finally {
    setIsExporting(false);
  }
};

/**
 * Fetch data for the report
 * @param {string} exportType - Type of report
 * @param {string} timePeriod - Time period for the report ('monthly', 'quarterly', 'yearly')
 * @returns {Promise<{data: any, fileName: string}>} Report data and suggested filename
 */
const fetchReportData = async (exportType, timePeriod = 'monthly') => {
  try {
    const { year, month } = getSelectedYearMonth();
    const dateRange = getDateRangesForPeriod(timePeriod);
    let data;
    let fileName;

    switch (exportType) {
      case 'vendors':
        const vendorsResult = await getVendors();
        if (vendorsResult.error) throw new Error(vendorsResult.error);
        
        // Calculate date range based on the time period
        const vendorDateRange = getDateRangesForPeriod(timePeriod);
        
        // For each vendor, get their transactions and payments
        const vendorsWithDetails = await Promise.all(vendorsResult.data.map(async (vendor) => {
          const [transactionsResult, paymentsResult] = await Promise.all([
            getVendorTransactions(vendor.id),
            getVendorPayments(vendor.id)
          ]);
          
          // Filter transactions by date range
          const allTransactions = transactionsResult.error ? [] : transactionsResult.data;
          const filteredTransactions = allTransactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            transactionDate.setHours(0, 0, 0, 0);
            
            const startDate = new Date(vendorDateRange.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(vendorDateRange.endDate);
            endDate.setHours(0, 0, 0, 0);
            
            return transactionDate >= startDate && transactionDate <= endDate;
          });
          
          // Filter payments by date range
          const allPayments = paymentsResult.error ? [] : paymentsResult.data;
          const filteredPayments = allPayments.filter(payment => {
            const paymentDate = new Date(payment.date);
            paymentDate.setHours(0, 0, 0, 0);
            
            const startDate = new Date(vendorDateRange.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(vendorDateRange.endDate);
            endDate.setHours(0, 0, 0, 0);
            
            return paymentDate >= startDate && paymentDate <= endDate;
          });
          
          return {
            ...vendor,
            transactions: filteredTransactions,
            payments: filteredPayments
          };
        }));
        
        data = {
          vendors: vendorsWithDetails,
          dateRange: vendorDateRange
        };
        fileName = `Vendor_Transactions_${timePeriod}`;
        break;

      case 'customers':
        // Get all customers with their transactions
        const customersResult = await getCustomers();
        if (customersResult.error) throw new Error(customersResult.error);
        
        // Calculate date range based on the time period
        const customerDateRange = getDateRangesForPeriod(timePeriod);
        
        // For each customer, get their transactions
        const customersWithTransactionsData = await Promise.all(customersResult.data.map(async (customer) => {
          const transactions = await getCustomerTransactions(customer.id);
          
          // Get all transaction data
          const allTransactionData = transactions.error ? [] : transactions.data;
          
          // Filter transactions by date range
          const filteredTransactions = allTransactionData.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            transactionDate.setHours(0, 0, 0, 0);
            
            const startDate = new Date(customerDateRange.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(customerDateRange.endDate);
            endDate.setHours(0, 0, 0, 0);
            
            return transactionDate >= startDate && transactionDate <= endDate;
          });
          
          // Calculate total outstanding for this customer's filtered transactions
          const totalOutstanding = filteredTransactions.reduce((sum, trans) => {
            return sum + (trans.outstanding_amount || 0);
          }, 0);
          
          return {
            ...customer,
            transactions: filteredTransactions,
            total_outstanding: totalOutstanding
          };
        }));
        
        data = {
          customers: customersWithTransactionsData,
          dateRange: customerDateRange
        };
        fileName = `Customer_Transactions_${timePeriod}`;
        break;

      // 'all' case (Complete Financial Report) has been removed
        
      case 'overall':
        // Collect monthly summaries for the selected time period
        const periodSummaries = [];
        
        // Calculate date range based on the time period
        const startDate = dateRange.startDate;
        const endDate = dateRange.endDate;
        const currentDate = new Date(startDate);
        
        // Loop through each month in the range
        while (currentDate <= endDate) {
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1; // 1-12
          
          try {
            const monthlySummary = await getMonthlySummary(currentYear, currentMonth);
            if (!monthlySummary.error) {
              periodSummaries.push({
                ...monthlySummary.data,
                year: currentYear,
                month: currentMonth
              });
            } else {
              // If no data for this month, add zero values
              periodSummaries.push({
                monthly_income: 0,
                monthly_expenses: 0,
                year: currentYear,
                month: currentMonth
              });
            }
          } catch (err) {
            console.log(`No data for ${currentYear}-${currentMonth}`);
            // Add zero values on error
            periodSummaries.push({
              monthly_income: 0,
              monthly_expenses: 0,
              year: currentYear,
              month: currentMonth
            });
          }
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        // Get vendor and customer data with transactions
        const [vendorsList, customersList] = await Promise.all([
          getVendors(),
          getCustomers()
        ]);
        
        // Get transactions for each customer
        const enhancedCustomers = await Promise.all(
          (customersList.error ? [] : customersList.data).map(async (customer) => {
            const transactions = await getCustomerTransactions(customer.id);
            
            // Calculate total outstanding for this customer
            const transactionData = transactions.error ? [] : transactions.data;
            const totalOutstanding = transactionData.reduce((sum, trans) => {
              return sum + (trans.outstanding_amount || 0);
            }, 0);
            
            return {
              ...customer,
              transactions: transactionData,
              total_outstanding: totalOutstanding
            };
          })
        );
        
        data = {
          periodSummaries,
          dateRange,
          vendors: vendorsList.error ? [] : vendorsList.data,
          customers: enhancedCustomers
        };
        
        fileName = `Overall_Summary_${timePeriod}`;
        break;
        
      case 'vendor_payments':
        // Get all vendor payments for the selected time period
        const allVendors = await getVendors();
        if (allVendors.error) throw new Error(allVendors.error);
        
        // For each vendor, get their payments within the date range
        const vendorsWithPayments = await Promise.all(allVendors.data.map(async (vendor) => {
          const paymentsResult = await getVendorPayments(vendor.id);
          const payments = paymentsResult.error ? [] : paymentsResult.data;
          
          // Filter payments by date range
          const filteredPayments = payments.filter(payment => {
            // Ensure both dates are compared at the start of their respective days
            const paymentDate = new Date(payment.date);
            paymentDate.setHours(0, 0, 0, 0);
            
            const startDate = new Date(dateRange.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(dateRange.endDate);
            endDate.setHours(0, 0, 0, 0);
            
            return paymentDate >= startDate && paymentDate <= endDate;
          });
          
          return {
            ...vendor,
            payments: filteredPayments
          };
        }));
        
        // Only include vendors with payments
        const vendorsWithFilteredPayments = vendorsWithPayments.filter(vendor => 
          vendor.payments && vendor.payments.length > 0
        );
        
        data = {
          vendors: vendorsWithFilteredPayments,
          dateRange
        };
        
        fileName = `Vendor_Payments_${timePeriod}`;
        break;
        
      default:
        throw new Error(`Unknown export type: ${exportType}`);
    }
    
    return { data, fileName };
  } catch (error) {
    console.error('Error fetching report data:', error);
    throw error;
  }
};

/**
 * Get current year and month
 * @returns {{year: number, month: number}}
 */
const getSelectedYearMonth = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1 // JavaScript months are 0-indexed
  };
};

/**
 * Get date ranges for different time periods
 * @param {string} timePeriod - 'monthly', 'quarterly', or 'yearly'
 * @returns {{startDate: Date, endDate: Date, label: string}}
 */
const getDateRangesForPeriod = (timePeriod) => {
  const now = new Date();
  const endDate = new Date(now); // End date is always today
  let startDate = new Date(now);
  let label = '';
  
  switch (timePeriod) {
    case 'monthly':
      // Start from the 1st of the current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      label = `${startDate.toLocaleString('default', { month: 'long' })} ${startDate.getFullYear()}`;
      break;
      
    case 'quarterly':
      // Go back 3 months
      startDate.setMonth(startDate.getMonth() - 3);
      label = `${startDate.toLocaleString('default', { month: 'short' })} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
      break;
      
    case 'yearly':
      // Go back 12 months
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1); // Make it inclusive
      label = `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
      break;
  }
  
  return { startDate, endDate, label };
};

/**
 * Generate HTML content for the PDF
 * @param {string} exportType - Type of report
 * @param {any} data - Data to include in the report
 * @param {string} currency - Currency symbol
 * @returns {string} HTML content
 */
const generatePdfContent = (exportType, data, currency) => {
  const currentDate = new Date().toLocaleDateString();
  
  // Create a styled HTML template with the data
  let reportContent = '';
  let reportTitle = exportType.charAt(0).toUpperCase() + exportType.slice(1);
  
  // Customize report title based on the report type and time period
  if (exportType === 'overall') {
    reportTitle = `Overall Summary (${data.dateRange.label})`;
  } else if (exportType === 'vendor_payments') {
    reportTitle = `Vendor Payments (${data.dateRange.label})`;
  }
  
  switch (exportType) {
    case 'vendors':
      reportContent = generateVendorsContent(data, currency);
      break;
    case 'customers':
      reportContent = generateCustomersContent(data, currency);
      break;
    case 'overall':
      reportContent = generateOverallSummaryContent(data, currency);
      break;
    case 'vendor_payments':
      reportContent = generateVendorPaymentsContent(data, currency);
      break;
  }
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Project-Track Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
          }
          h1 {
            color: #4f46e5;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
          }
          h2 {
            color: #4338ca;
            margin-top: 30px;
          }
          h3 {
            color: #6366f1;
            margin-top: 25px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
          }
          th { background-color: #f2f2f2; }
          .amount { text-align: right; }
          .positive { color: #10b981; }
          .negative { color: #ef4444; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
          .balance-summary {
            background: #f9fafb;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .summary-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .chart-container {
            margin: 20px 0;
            border: 1px solid #e5e7eb;
            padding: 10px;
            border-radius: 5px;
          }
          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          @media (max-width: 768px) {
            .grid-container {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <h1>Project-Track: ${reportTitle}</h1>
        <p>Generated on: ${currentDate}</p>
        
        ${reportContent}
        
        <div class="footer">
          Generated by Project-Track App
        </div>
      </body>
    </html>
  `;
};

// Monthly Summary content generation function removed

/**
 * Generate vendors content
 * @param {any} data - Vendors data
 * @param {string} currency - Currency symbol
 * @returns {string} HTML content
 */
const generateVendorsContent = (data, currency) => {
  let vendorsHtml = '';
  const { vendors, dateRange } = data;
  
  // Add date range header
  const dateRangeHeader = `
    <div class="summary-card">
      <h2>Vendor Transactions and Payments (${dateRange.label})</h2>
    </div>
  `;
  
  vendors.forEach((vendor) => {
    let transactionsHtml = '';
    let paymentsHtml = '';
    
    // Generate transactions table
    if (vendor.transactions && vendor.transactions.length > 0) {
      vendor.transactions.forEach((transaction) => {
        transactionsHtml += `
          <tr>
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.items.map((item) => 
              `${item.name || item.item_name} (${item.quantity || item.qty} × ${currency}${item.unit_price || item.unitPrice})`
            ).join(', ')}</td>
            <td class="amount">${currency}${transaction.total_amount?.toLocaleString() || 0}</td>
          </tr>
        `;
      });
    } else {
      transactionsHtml = `<tr><td colspan="3">No transactions found</td></tr>`;
    }
    
    // Generate payments table
    if (vendor.payments && vendor.payments.length > 0) {
      vendor.payments.forEach((payment) => {
        paymentsHtml += `
          <tr>
            <td>${new Date(payment.date).toLocaleDateString()}</td>
            <td>${payment.payment_method || 'Cash'}</td>
            <td>${payment.notes || '-'}</td>
            <td class="amount">${currency}${payment.amount?.toLocaleString() || 0}</td>
          </tr>
        `;
      });
    } else {
      paymentsHtml = `<tr><td colspan="4">No payments found</td></tr>`;
    }
    
    // Calculate total transactions and payments
    const totalTransactions = vendor.transactions ? vendor.transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0) : 0;
    const totalPayments = vendor.payments ? vendor.payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0;
    const balanceDue = totalTransactions - totalPayments;
    
    vendorsHtml += `
      <div class="summary">
        <h2>Vendor: ${vendor.name}</h2>
        <div class="balance-summary">
          <p>Total Purchases: ${currency}${totalTransactions.toLocaleString()}</p>
          <p>Total Payments: ${currency}${totalPayments.toLocaleString()}</p>
          <p>Balance Due: <strong class="${balanceDue > 0 ? 'negative' : 'positive'}">${currency}${balanceDue.toLocaleString()}</strong></p>
        </div>
        
        <h3>Transactions</h3>
        <table>
          <tr>
            <th>Date</th>
            <th>Items</th>
            <th class="amount">Amount</th>
          </tr>
          ${transactionsHtml}
        </table>
        
        <h3>Payments</h3>
        <table>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th>Notes</th>
            <th class="amount">Amount</th>
          </tr>
          ${paymentsHtml}
        </table>
      </div>
    `;
  });
  
  return dateRangeHeader + (vendorsHtml || '<p>No vendor data available for this period</p>');
};

/**
 * Generate customers content
 * @param {any} data - Customers data
 * @param {string} currency - Currency symbol
 * @returns {string} HTML content
 */
const generateCustomersContent = (data, currency) => {
  let customersHtml = '';
  const { customers, dateRange } = data;
  
  // Add date range header
  const dateRangeHeader = `
    <div class="summary-card">
      <h2>Customer Transactions and Payments (${dateRange.label})</h2>
    </div>
  `;
  
  customers.forEach((customer) => {
    let transactionsHtml = '';
    let paymentsHtml = '';
    let allPayments = [];
    
    // Generate transactions table
    if (customer.transactions && customer.transactions.length > 0) {
      customer.transactions.forEach((transaction) => {
        transactionsHtml += `
          <tr>
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.items.map((item) => 
              `${item.name || item.item_name} (${item.quantity || item.qty} × ${currency}${item.unit_price || item.unitPrice})`
            ).join(', ')}</td>
            <td class="amount">${currency}${transaction.total_amount?.toLocaleString() || 0}</td>
          </tr>
        `;
        
        // Collect all payments from transactions
        if (transaction.payments && transaction.payments.length > 0) {
          transaction.payments.forEach(payment => {
            allPayments.push({
              ...payment,
              transaction_id: transaction.id,
              transaction_date: transaction.date
            });
          });
        }
      });
    } else {
      transactionsHtml = `<tr><td colspan="3">No transactions found</td></tr>`;
    }
    
    // Generate payments table
    if (allPayments.length > 0) {
      // Sort payments by date (newest first)
      allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      allPayments.forEach((payment) => {
        paymentsHtml += `
          <tr>
            <td>${new Date(payment.date).toLocaleDateString()}</td>
            <td>${payment.payment_method || 'Cash'}</td>
            <td>${payment.notes || '-'}</td>
            <td class="amount">${currency}${payment.amount?.toLocaleString() || 0}</td>
          </tr>
        `;
      });
    } else {
      paymentsHtml = `<tr><td colspan="4">No payments found</td></tr>`;
    }
    
    // Calculate total transactions and payments
    const totalTransactions = customer.transactions ? customer.transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0) : 0;
    const totalPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceDue = totalTransactions - totalPayments;
    
    customersHtml += `
      <div class="summary">
        <h2>Customer: ${customer.name}</h2>
        <div class="balance-summary">
          <p>Total Sales: ${currency}${totalTransactions.toLocaleString()}</p>
          <p>Total Payments: ${currency}${totalPayments.toLocaleString()}</p>
          <p>Balance Due: <strong class="${balanceDue > 0 ? 'negative' : 'positive'}">${currency}${balanceDue.toLocaleString()}</strong></p>
        </div>
        
        <h3>Transactions</h3>
        <table>
          <tr>
            <th>Date</th>
            <th>Items</th>
            <th class="amount">Amount</th>
          </tr>
          ${transactionsHtml}
        </table>
        
        <h3>Payments</h3>
        <table>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th>Notes</th>
            <th class="amount">Amount</th>
          </tr>
          ${paymentsHtml}
        </table>
      </div>
    `;
  });
  
  return dateRangeHeader + (customersHtml || '<p>No customer data available for this period</p>');
};

/**
 * Generate full report content
 * @param {any} data - Full report data
 * @param {string} currency - Currency symbol
 * @returns {string} HTML content
 */
// Full Report content generation function removed

/**
 * Generate overall summary content combining monthly summaries, vendor transactions, and customer transactions
 * @param {any} data - Data containing periodSummaries, vendors, customers, and dateRange
 * @param {string} currency - Currency symbol
 * @returns {string} HTML content
 */
const generateOverallSummaryContent = (data, currency) => {
  // Calculate summary totals
  const totalIncome = data.periodSummaries.reduce((sum, period) => sum + (period.monthly_income || 0), 0);
  const totalExpenses = data.periodSummaries.reduce((sum, period) => sum + (period.monthly_expenses || 0), 0);
  
  // Calculate total outstanding balances
  const totalVendorOutstanding = data.vendors.reduce((sum, vendor) => sum + (vendor.remaining_balance || 0), 0);
  const totalCustomerOutstanding = data.customers.reduce((sum, customer) => sum + (customer.total_outstanding || 0), 0);
  const netBalance = totalIncome - totalExpenses;
  
  // Generate period summary section
  const periodSummarySection = `
    <div class="summary-card">
      <h2>Financial Summary (${data.dateRange.label})</h2>
      <table>
        <tr>
          <th>Category</th>
          <th class="amount">Amount (${currency})</th>
        </tr>
        <tr>
          <td>Total Income</td>
          <td class="amount positive">${currency}${totalIncome.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Total Expenses</td>
          <td class="amount negative">${currency}${totalExpenses.toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Net Balance</strong></td>
          <td class="amount ${netBalance >= 0 ? 'positive' : 'negative'}"><strong>${currency}${netBalance.toLocaleString()}</strong></td>
        </tr>
      </table>
    </div>
  `;
  
  // Generate vendor transactions summary
  const vendorSummarySection = data.vendors && data.vendors.length > 0 ? `
    <div class="summary-card">
      <h2>Vendor Summary</h2>
      <table>
        <tr>
          <th>Vendor Name</th>
          <th class="amount">Outstanding Balance</th>
        </tr>
        ${data.vendors.map((vendor) => `
          <tr>
            <td>${vendor.name}</td>
            <td class="amount">${currency}${vendor.remaining_balance?.toLocaleString() || 0}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  ` : '<div class="summary-card"><p>No vendor data available</p></div>';
  
  // Generate customer transactions summary
  const customerSummarySection = data.customers && data.customers.length > 0 ? `
    <div class="summary-card">
      <h3>Customer Summary</h3>
      <table>
        <tr>
          <th>Customer Name</th>
          <th class="amount">Outstanding Balance</th>
        </tr>
        ${data.customers.map(customer => {
          return `
            <tr>
              <td>${customer.name}</td>
              <td class="amount">${currency}${(customer.total_outstanding || 0).toLocaleString()}</td>
            </tr>
          `;
        }).join('')}
        <tr class="total">
          <td><strong>Total Outstanding</strong></td>
          <td class="amount"><strong>${currency}${totalCustomerOutstanding.toLocaleString()}</strong></td>
        </tr>
      </table>
    </div>
  ` : '<div class="summary-card"><p>No customer data available</p></div>';
  
  // Generate monthly breakdown if we have multiple months
  let monthlyBreakdown = '';
  if (data.periodSummaries.length > 1) {
    monthlyBreakdown = `
      <div class="summary-card">
        <h2>Monthly Breakdown</h2>
        <table>
          <tr>
            <th>Month</th>
            <th class="amount">Income</th>
            <th class="amount">Expenses</th>
            <th class="amount">Net</th>
          </tr>
          ${data.periodSummaries.map((period) => {
            const periodDate = new Date(period.year, period.month - 1);
            const monthYear = periodDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            const net = (period.monthly_income || 0) - (period.monthly_expenses || 0);
            return `
              <tr>
                <td>${monthYear}</td>
                <td class="amount positive">${currency}${(period.monthly_income || 0).toLocaleString()}</td>
                <td class="amount negative">${currency}${(period.monthly_expenses || 0).toLocaleString()}</td>
                <td class="amount ${net >= 0 ? 'positive' : 'negative'}">${currency}${net.toLocaleString()}</td>
              </tr>
            `;
          }).join('')}
        </table>
      </div>
    `;
  }
  
  return `
    <div class="grid-container">
      ${periodSummarySection}
      ${monthlyBreakdown}
    </div>
    <div class="grid-container">
      ${vendorSummarySection}
      ${customerSummarySection}
    </div>
  `;
};

/**
 * Generate vendor payments report content
 * @param {any} data - Data containing vendors with payments and dateRange
 * @param {string} currency - Currency symbol
 * @returns {string} HTML content
 */
const generateVendorPaymentsContent = (data, currency) => {
  if (!data.vendors || data.vendors.length === 0) {
    return `<div class="summary-card"><p>No vendor payment data available for this period.</p></div>`;
  }
  
  // Calculate totals
  const totalPayments = data.vendors.reduce((sum, vendor) => {
    return sum + vendor.payments.reduce((vendorSum, payment) => vendorSum + (payment.amount || 0), 0);
  }, 0);
  
  // Generate summary section
  const summarySection = `
    <div class="summary-card">
      <h2>Payment Summary (${data.dateRange.label})</h2>
      <table>
        <tr>
          <th>Metric</th>
          <th class="amount">Value</th>
        </tr>
        <tr>
          <td>Total Vendors Paid</td>
          <td class="amount">${data.vendors.length}</td>
        </tr>
        <tr>
          <td>Total Payments</td>
          <td class="amount">${data.vendors.reduce((sum, v) => sum + v.payments.length, 0)}</td>
        </tr>
        <tr>
          <td>Total Amount Paid</td>
          <td class="amount">${currency}${totalPayments.toLocaleString()}</td>
        </tr>
      </table>
    </div>
  `;
  
  // Generate vendor payments detail
  let vendorPaymentsHtml = '';
  
  data.vendors.forEach(vendor => {
    const vendorTotal = vendor.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    let paymentsHtml = '';
    vendor.payments.forEach(payment => {
      paymentsHtml += `
        <tr>
          <td>${new Date(payment.date).toLocaleDateString()}</td>
          <td>${payment.payment_method || 'Cash'}</td>
          <td>${payment.notes || '-'}</td>
          <td class="amount">${currency}${payment.amount?.toLocaleString() || 0}</td>
        </tr>
      `;
    });
    
    vendorPaymentsHtml += `
      <div class="summary-card">
        <h2>Vendor: ${vendor.name}</h2>
        <p>Total Payments: <strong>${currency}${vendorTotal.toLocaleString()}</strong></p>
        
        <h3>Payment Details</h3>
        <table>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th>Notes</th>
            <th class="amount">Amount</th>
          </tr>
          ${paymentsHtml}
        </table>
      </div>
    `;
  });
  
  return summarySection + vendorPaymentsHtml;
};
