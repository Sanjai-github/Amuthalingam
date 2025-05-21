import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';
import { 
  getCustomers, 
  getCustomerTransactions, 
  getSingleCustomerOutstandingBalance,
  addPaymentToTransaction 
} from '../../Firebase/customerService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../Firebase/config';

// Define interfaces for our data structures
interface Payment {
  date: string;
  amount: number;
}

interface CustomerTransaction {
  id: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
  }>;
  material_amount: number;
  total_amount: number;
  payments: Payment[];
  total_payments: number;
  outstanding_amount: number;
  balance: number;
  createdAt?: any;
  updatedAt?: any;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  totalSales?: number;
  totalDue?: number;
  lastTransactionDate?: string;
  transactions?: any[];
  createdAt?: any;
  updatedAt?: any;
}

// Dummy data for development
const dummyCustomers: Customer[] = [
  {
    id: '1',
    name: 'Rahul Sharma',
    totalSales: 18750,
    totalDue: 5000,
    transactions: [
      {
        id: 't1',
        date: '2025-05-16',
        items: [
          { name: 'Marble Flooring', quantity: '100', unitPrice: '120' },
          { name: 'Installation', quantity: '1', unitPrice: '2000' }
        ],
        materialAmount: 14000,
        totalAmount: 14000,
        payments: [
          { id: 'p1', date: '2025-05-16', amount: 10000 },
          { id: 'p2', date: '2025-05-18', amount: 2000 }
        ],
        balance: 2000
      }
    ]
  },
  {
    id: '2',
    name: 'Priya Patel',
    totalSales: 8500,
    totalDue: 3000,
    transactions: [
      {
        id: 't2',
        date: '2025-05-12',
        items: [
          { name: 'Granite Countertop', quantity: '15', unitPrice: '450' },
          { name: 'Sink', quantity: '1', unitPrice: '1750' }
        ],
        materialAmount: 8500,
        totalAmount: 8500,
        payments: [
          { id: 'p3', date: '2025-05-12', amount: 5500 }
        ],
        balance: 3000
      }
    ]
  },
  {
    id: '3',
    name: 'Vikram Singh',
    totalSales: 5250,
    totalDue: 0,
    transactions: [
      {
        id: 't3',
        date: '2025-05-08',
        items: [
          { name: 'Wooden Flooring', quantity: '50', unitPrice: '95' },
          { name: 'Polish', quantity: '2', unitPrice: '500' }
        ],
        materialAmount: 5250,
        totalAmount: 5250,
        payments: [
          { id: 'p4', date: '2025-05-08', amount: 5250 }
        ],
        balance: 0
      }
    ]
  }
];

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<CustomerTransaction | null>(null);

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch customers from Firebase
  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const result = await getCustomers();
      
      if (result.error) {
        console.error('Error fetching customers:', result.error);
        return;
      }
      
      // Transform the data to match our Customer interface
      const customersList: Customer[] = await Promise.all(result.data.map(async (customer) => {
        // Get outstanding balance for each customer
        const balanceResult = await getSingleCustomerOutstandingBalance(customer.id);
        const totalDue = balanceResult.error ? 0 : balanceResult.data;
        
        // Get all transactions to calculate total sales and get the latest transaction date
        const transactionsResult = await getCustomerTransactions(customer.id);
        let totalSales = 0;
        let latestTransactionDate = '';
        
        if (!transactionsResult.error && transactionsResult.data.length > 0) {
          // Sum up all transaction total amounts
          totalSales = transactionsResult.data.reduce(
            (sum, transaction) => sum + (transaction.total_amount || 0), 
            0
          );
          
          // Find the latest transaction date
          const sortedTransactions = [...transactionsResult.data].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
          
          if (sortedTransactions.length > 0) {
            latestTransactionDate = sortedTransactions[0].date;
          }
        }
        
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone || '',
          address: customer.address || '',
          totalSales: totalSales,
          totalDue: totalDue,
          lastTransactionDate: latestTransactionDate,
          transactions: [] // We'll load transactions only when a customer is selected
        };
      }));
      
      setCustomers(customersList);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleAddTransaction = () => {
    router.push('/forms/customer-transaction-form');
  };

  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);

  const handleCustomerSelect = async (customer: Customer) => {
    try {
      setSelectedCustomer(customer);
      setSelectedTransaction(null);
      setLoadingTransactions(true);
      
      // Fetch transactions for the selected customer
      const result = await getCustomerTransactions(customer.id);
      
      if (result.error) {
        console.error('Error fetching customer transactions:', result.error);
        return;
      }
      
      // Transform the data to match our CustomerTransaction interface
      const transformedTransactions: CustomerTransaction[] = result.data.map(transaction => {
        // Calculate total payments
        const totalPayments = transaction.payments ? 
          transaction.payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0) : 0;
        
        // Calculate outstanding amount
        const outstandingAmount = transaction.total_amount - totalPayments;
        
        return {
          id: transaction.id,
          date: transaction.date,
          items: transaction.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price
          })),
          material_amount: transaction.material_amount,
          total_amount: transaction.total_amount,
          payments: transaction.payments || [],
          total_payments: totalPayments,
          outstanding_amount: outstandingAmount,
          balance: outstandingAmount,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        };
      });
      
      setCustomerTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error selecting customer:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleTransactionSelect = (transaction: CustomerTransaction) => {
    setSelectedTransaction(transaction);
  };
  
  // State for payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [addingPayment, setAddingPayment] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [selectedTransactionForPayment, setSelectedTransactionForPayment] = useState<CustomerTransaction | null>(null);
  
  // Open payment modal directly from customer list
  const openDirectPaymentModal = async (customer: Customer) => {
    try {
      setSelectedCustomerForPayment(customer);
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      
      // Fetch the latest transaction for this customer
      const result = await getCustomerTransactions(customer.id);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data.length === 0) {
        Alert.alert('No Transactions', 'This customer has no transactions to add payments to.');
        return;
      }
      
      // Sort transactions by date (newest first) and find one with outstanding balance
      const sortedTransactions = [...result.data].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      // Find a transaction with outstanding balance
      const transactionWithBalance = sortedTransactions.find(transaction => {
        const totalPayments = transaction.payments ? 
          transaction.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0) : 0;
        return transaction.total_amount - totalPayments > 0;
      });
      
      if (!transactionWithBalance) {
        Alert.alert('No Outstanding Balance', 'This customer has no transactions with outstanding balance.');
        return;
      }
      
      // Calculate total payments and outstanding amount
      const totalPayments = transactionWithBalance.payments ? 
        transactionWithBalance.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0) : 0;
      
      const outstandingAmount = transactionWithBalance.total_amount - totalPayments;
      
      // Create a proper CustomerTransaction object
      const selectedTransaction: CustomerTransaction = {
        id: transactionWithBalance.id,
        date: transactionWithBalance.date,
        items: transactionWithBalance.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        material_amount: transactionWithBalance.material_amount,
        total_amount: transactionWithBalance.total_amount,
        payments: transactionWithBalance.payments || [],
        total_payments: totalPayments,
        outstanding_amount: outstandingAmount,
        balance: outstandingAmount
      };
      
      setSelectedTransactionForPayment(selectedTransaction);
      setPaymentModalVisible(true);
      
    } catch (error) {
      console.error('Error preparing payment:', error);
      Alert.alert('Error', 'Failed to prepare payment. Please try again.');
    }
  };
  
  // Handle adding a payment to a transaction
  const handleAddPayment = async () => {
    // Determine which customer and transaction to use
    const customer = selectedCustomerForPayment || selectedCustomer;
    const transaction = selectedTransactionForPayment || selectedTransaction;
    
    if (!transaction || !customer) {
      Alert.alert('Error', 'Customer or transaction information is missing');
      return;
    }
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    
    try {
      setAddingPayment(true);
      
      // Create the new payment object
      const newPayment: Payment = {
        date: paymentDate,
        amount: parseFloat(paymentAmount)
      };
      
      // Use the addPaymentToTransaction service function
      const result = await addPaymentToTransaction(
        customer.id,
        transaction.id,
        newPayment
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // After successful payment addition, fetch the updated transaction
      const updatedTransactionResult = await getCustomerTransactions(customer.id);
      if (updatedTransactionResult.error) {
        throw new Error(updatedTransactionResult.error);
      }
      
      // Find the updated transaction in the results
      const updatedTransaction = updatedTransactionResult.data.find(
        (t: any) => t.id === transaction.id
      );
      
      if (!updatedTransaction) {
        throw new Error('Updated transaction not found');
      }
      
      // Calculate new total payments
      const newTotalPayments = updatedTransaction.payments ? 
        updatedTransaction.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0) : 0;
      
      // Calculate new outstanding amount
      const newOutstandingAmount = updatedTransaction.total_amount - newTotalPayments;
      
      // If we're in transaction detail view, update the selected transaction
      if (selectedTransaction && selectedTransaction.id === transaction.id) {
        setSelectedTransaction({
          ...selectedTransaction,
          payments: updatedTransaction.payments,
          total_payments: newTotalPayments,
          outstanding_amount: newOutstandingAmount,
          balance: newOutstandingAmount
        });
        
        // Update the customer transactions list
        const updatedTransactions = customerTransactions.map(t => 
          t.id === transaction.id ? {
            ...t,
            payments: updatedTransaction.payments,
            total_payments: newTotalPayments,
            outstanding_amount: newOutstandingAmount,
            balance: newOutstandingAmount
          } : t
        );
        setCustomerTransactions(updatedTransactions);
      }
      
      // Fetch all customers to update the list with new balances
      const customersResult = await getCustomers();
      if (!customersResult.error) {
        // Transform the data to match our Customer interface
        const customersList: Customer[] = await Promise.all(customersResult.data.map(async (c) => {
          // Get outstanding balance for each customer
          const balanceResult = await getSingleCustomerOutstandingBalance(c.id);
          const totalDue = balanceResult.error ? 0 : balanceResult.data;
          
          // Get all transactions to calculate total sales
          const transactionsResult = await getCustomerTransactions(c.id);
          let totalSales = 0;
          
          if (!transactionsResult.error && transactionsResult.data.length > 0) {
            // Sum up all transaction total amounts
            totalSales = transactionsResult.data.reduce(
              (sum, t) => sum + (t.total_amount || 0), 
              0
            );
          }
          
          return {
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            address: c.address || '',
            totalSales: totalSales,
            totalDue: totalDue,
            transactions: [] // We'll load transactions only when a customer is selected
          };
        }));
        
        setCustomers(customersList);
      }
      
      // Reset the form and states
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentModalVisible(false);
      setSelectedCustomerForPayment(null);
      setSelectedTransactionForPayment(null);
      
      // Show success message
      Alert.alert('Success', 'Payment added successfully');
      
    } catch (error) {
      console.error('Error adding payment:', error);
      Alert.alert('Error', 'Failed to add payment. Please try again.');
    } finally {
      setAddingPayment(false);
    }
  };
  
  // Open payment modal for transaction detail view
  const openPaymentModal = () => {
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setSelectedCustomerForPayment(null);
    setSelectedTransactionForPayment(null);
    setPaymentModalVisible(true);
  };

  const handleBackToList = () => {
    setSelectedCustomer(null);
    setSelectedTransaction(null);
  };

  const handleBackToCustomer = () => {
    setSelectedTransaction(null);
  };

  // Customer List View
  const renderCustomerList = () => (
    <>
      {/* Search Bar */}
      <View className="px-4 py-2">
        <View className="bg-white flex-row items-center px-3 py-2 rounded-lg border border-gray-300">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Customers List */}
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#d88c9a" />
          <Text className="mt-2 text-gray-600">Loading customers...</Text>
        </View>
      ) : filteredCustomers.length > 0 ? (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          className="px-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#d88c9a"]}
              tintColor="#d88c9a"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
              onPress={() => handleCustomerSelect(item)}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
                {item.lastTransactionDate ? (
                  <View className="bg-blue-100 px-2 py-1 rounded-full">
                    <Text className="text-blue-800 font-medium">{item.lastTransactionDate}</Text>
                  </View>
                ) : null}
              </View>
              
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-500 text-sm">Total Sales</Text>
                  <Text className="text-gray-800 font-bold">₹{item.totalSales?.toLocaleString() || '0'}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-500 text-sm">Balance Due</Text>
                  {(item.totalDue || 0) > 0 ? (
                    <Text className="text-red-600 font-bold">₹{item.totalDue?.toLocaleString() || '0'}</Text>
                  ) : (
                    <Text className="text-green-600 font-bold">Paid</Text>
                  )}
                </View>
              </View>
              
              {/* Add Payment Button for customers with outstanding balance */}
              {(item.totalDue || 0) > 10 && (
                <View className="mt-3 flex-row justify-end">
                  <TouchableOpacity 
                    className="bg-blue-600 rounded-lg py-1 px-3"
                    onPress={() => openDirectPaymentModal(item)}
                  >
                    <Text className="text-white font-medium text-sm">Add Payment</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-4">
          <View className="w-64 h-64 mb-4">
            <LottieView
              source={require('../../assets/animations/empty_customers.json')}
              autoPlay
              loop
            />
          </View>
          <Text className="text-lg text-gray-600 text-center mb-6">No customers found</Text>
          <TouchableOpacity 
            className="bg-blue-600 px-6 py-3 rounded-lg"
            onPress={handleAddTransaction}
          >
            <Text className="text-white font-semibold">Add First Customer</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // Customer Detail View
  const renderCustomerDetail = () => {
    if (!selectedCustomer) return null;
    
    return (
      <View className="flex-1">
        {/* Customer Header */}
        <View className="bg-white px-4 py-4 shadow-sm mb-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={handleBackToList} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">{selectedCustomer.name}</Text>
          </View>
          
          <View className="flex-row justify-between mt-2">
            <View>
              <Text className="text-gray-500 text-sm">Total Sales</Text>
              <Text className="text-gray-800 font-bold">₹{selectedCustomer.totalSales?.toLocaleString() || '0'}</Text>
            </View>
            
            <View>
              <Text className="text-gray-500 text-sm">Balance Due</Text>
              {(selectedCustomer.totalDue || 0) > 0 ? (
                <Text className="text-red-600 font-bold">₹{selectedCustomer.totalDue?.toLocaleString() || '0'}</Text>
              ) : (
                <Text className="text-green-600 font-bold">Paid</Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Transaction List */}
        <Text className="px-4 text-lg font-semibold text-gray-800 mb-2">Transaction History</Text>
        
        {loadingTransactions ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#d88c9a" />
            <Text className="mt-2 text-gray-600">Loading transactions...</Text>
          </View>
        ) : customerTransactions.length > 0 ? (
          <FlatList
            data={customerTransactions}
            keyExtractor={(item) => item.id}
            className="px-4"
            renderItem={({ item }) => (
              <TouchableOpacity 
                className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                onPress={() => handleTransactionSelect(item)}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-medium text-gray-800">{item.date}</Text>
                  <Text className="font-bold text-gray-800">₹{item.total_amount.toLocaleString()}</Text>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="cart-outline" size={16} color="#6b7280" />
                    <Text className="text-gray-600 ml-1">{item.items.length} items</Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Ionicons name="wallet-outline" size={16} color="#6b7280" />
                    <Text className="text-gray-600 ml-1">{item.payments.length} payments</Text>
                  </View>
                  
                  <View>
                    <Text className={item.balance > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                      {item.balance > 0 ? `Due: ₹${item.balance.toLocaleString()}` : 'Paid'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View className="flex-1 justify-center items-center px-4">
            <Text className="text-lg text-gray-600 text-center mb-6">No transactions found</Text>
            <TouchableOpacity 
              className="bg-blue-600 px-6 py-3 rounded-lg"
              onPress={handleAddTransaction}
            >
              <Text className="text-white font-semibold">Add Transaction</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Transaction Detail View
  const renderTransactionDetail = () => {
    if (!selectedTransaction || !selectedCustomer) return null;
    
    return (
      <View className="flex-1">
        {/* Transaction Header */}
        <View className="bg-white px-4 py-4 shadow-sm mb-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={handleBackToCustomer} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Transaction Details</Text>
          </View>
          
          <View className="flex-row justify-between mt-2">
            <View>
              <Text className="text-gray-500 text-sm">Date</Text>
              <Text className="text-gray-800 font-medium">{selectedTransaction.date}</Text>
            </View>
            
            <View>
              <Text className="text-gray-500 text-sm">Total Amount</Text>
              <Text className="text-gray-800 font-bold">₹{selectedTransaction.total_amount.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        
        {/* Items Section */}
        <ScrollView className="flex-1">
          <View className="px-4 mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Items</Text>
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {selectedTransaction.items.map((item, index) => (
                <View key={index} className="flex-row justify-between mb-2">
                  <Text className="text-gray-700">
                    {item.name} ({item.quantity} × ₹{item.unit_price})
                  </Text>
                  <Text className="text-gray-700 font-medium">
                    ₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
                  </Text>
                </View>
              ))}
              
              <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
                <Text className="text-gray-700 font-medium">Material Amount</Text>
                <Text className="text-gray-700 font-medium">₹{selectedTransaction.material_amount.toLocaleString()}</Text>
              </View>
              
              <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
                <Text className="text-gray-800 font-bold">Total</Text>
                <Text className="text-gray-800 font-bold">₹{selectedTransaction.total_amount.toLocaleString()}</Text>
              </View>
            </View>
          </View>
          
          {/* Payments Section */}
          <View className="px-4 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Payments</Text>
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {selectedTransaction.payments && selectedTransaction.payments.length > 0 ? (
                selectedTransaction.payments.map((payment, index) => (
                  <View key={index} className="flex-row justify-between mb-2">
                    <Text className="text-gray-700">{payment.date}</Text>
                    <Text className="text-green-600 font-medium">₹{payment.amount.toLocaleString()}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-600 italic text-center py-2">No payments recorded</Text>
              )}
              
              {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
                  <Text className="text-gray-700 font-medium">Total Paid</Text>
                  <Text className="text-green-600 font-medium">
                    ₹{selectedTransaction.payments.reduce((sum: number, p: Payment) => sum + p.amount, 0).toLocaleString()}
                  </Text>
                </View>
              )}
              
              <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
                <Text className="text-gray-800 font-bold">Balance</Text>
                {selectedTransaction.balance > 0 ? (
                  <Text className="text-red-600 font-bold">₹{selectedTransaction.balance.toLocaleString()}</Text>
                ) : (
                  <Text className="text-green-600 font-bold">Paid</Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#f5e9e2' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-16 pb-4 px-4 shadow-sm">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold text-gray-800">Customers</Text>
        </View>
      </View>
      
      {/* Content */}
      {selectedTransaction ? renderTransactionDetail() : 
       selectedCustomer ? renderCustomerDetail() : 
       renderCustomerList()}
      
      {/* Custom Tab Bar with Animations */}
      <CustomTabBar />
      
      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center items-center bg-black bg-opacity-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View className="bg-white rounded-xl p-5 w-11/12 max-w-md">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">Add Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 mb-1">Payment Date</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            
            <View className="mb-6">
              <Text className="text-gray-700 mb-1">Payment Amount (₹)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
              />
            </View>
            
            <View className="flex-row justify-end">
              <TouchableOpacity 
                className="bg-gray-300 rounded-lg py-2 px-4 mr-2"
                onPress={() => setPaymentModalVisible(false)}
              >
                <Text className="text-gray-800 font-medium">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-blue-600 rounded-lg py-2 px-4"
                onPress={handleAddPayment}
                disabled={addingPayment}
              >
                {addingPayment ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold">Save Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
