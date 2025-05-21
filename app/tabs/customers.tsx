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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';
import { getCustomers, getCustomerTransactions, getSingleCustomerOutstandingBalance } from '../../Firebase/customerService';

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
        
        // Get all transactions to calculate total sales
        const transactionsResult = await getCustomerTransactions(customer.id);
        let totalSales = 0;
        
        if (!transactionsResult.error && transactionsResult.data.length > 0) {
          // Sum up all transaction total amounts
          totalSales = transactionsResult.data.reduce(
            (sum, transaction) => sum + (transaction.total_amount || 0), 
            0
          );
        }
        
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone || '',
          address: customer.address || '',
          totalSales: totalSales,
          totalDue: totalDue,
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
                {/* We don't know transaction count until we select a customer */}
                {item.phone && (
                  <View className="bg-blue-100 px-2 py-1 rounded-full">
                    <Text className="text-blue-800 font-medium">{item.phone}</Text>
                  </View>
                )}
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
    </View>
  );
}
