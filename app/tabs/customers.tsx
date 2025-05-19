import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';

// Define interfaces for our data structures
interface Payment {
  id: string;
  date: string;
  amount: number;
}

interface CustomerTransaction {
  id: string;
  date: string;
  items: Array<{
    name: string;
    quantity: string;
    unitPrice: string;
  }>;
  materialAmount: number;
  totalAmount: number;
  payments: Payment[];
  balance: number;
}

interface Customer {
  id: string;
  name: string;
  totalSales: number;
  totalDue: number;
  transactions: CustomerTransaction[];
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
  const [customers, setCustomers] = useState<Customer[]>(dummyCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<CustomerTransaction | null>(null);

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // In a real app, this would fetch customers from Firebase
  useEffect(() => {
    // Quick initialization without artificial delay
    setIsLoading(false);
    
    // When implementing Firebase, you would fetch customers here
    // Example:
    // const fetchCustomers = async () => {
    //   const customersSnapshot = await firebase.firestore().collection('Customers').get();
    //   const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    //   setCustomers(customersData);
    //   setIsLoading(false);
    // };
    // fetchCustomers();
  }, []);

  const handleAddTransaction = () => {
    router.push('/forms/customer-transaction');
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedTransaction(null);
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
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#d88c9a" />
        </View>
      ) : filteredCustomers.length > 0 ? (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          className="px-4"
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
              onPress={() => handleCustomerSelect(item)}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
                <View className="bg-blue-100 px-2 py-1 rounded-full">
                  <Text className="text-blue-800 font-medium">{item.transactions.length} Transactions</Text>
                </View>
              </View>
              
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-500 text-sm">Total Sales</Text>
                  <Text className="text-gray-800 font-bold">₹{item.totalSales.toLocaleString()}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-500 text-sm">Balance Due</Text>
                  {item.totalDue > 0 ? (
                    <Text className="text-red-600 font-bold">₹{item.totalDue.toLocaleString()}</Text>
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
              <Text className="text-gray-800 font-bold">₹{selectedCustomer.totalSales.toLocaleString()}</Text>
            </View>
            
            <View>
              <Text className="text-gray-500 text-sm">Balance Due</Text>
              {selectedCustomer.totalDue > 0 ? (
                <Text className="text-red-600 font-bold">₹{selectedCustomer.totalDue.toLocaleString()}</Text>
              ) : (
                <Text className="text-green-600 font-bold">Paid</Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Transaction List */}
        <Text className="px-4 text-lg font-semibold text-gray-800 mb-2">Transaction History</Text>
        <FlatList
          data={selectedCustomer.transactions}
          keyExtractor={(item) => item.id}
          className="px-4"
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
              onPress={() => handleTransactionSelect(item)}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-medium text-gray-800">{item.date}</Text>
                <Text className="font-bold text-gray-800">₹{item.totalAmount.toLocaleString()}</Text>
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
              <Text className="text-gray-800 font-bold">₹{selectedTransaction.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        
        {/* Items Section */}
        <View className="px-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-2">Items</Text>
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            {selectedTransaction.items.map((item, index) => (
              <View key={index} className="flex-row justify-between mb-2">
                <Text className="text-gray-700">
                  {item.name} ({item.quantity} × ₹{item.unitPrice})
                </Text>
                <Text className="text-gray-700 font-medium">
                  ₹{(parseFloat(item.quantity) * parseFloat(item.unitPrice)).toLocaleString()}
                </Text>
              </View>
            ))}
            
            <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
              <Text className="text-gray-700 font-medium">Material Amount</Text>
              <Text className="text-gray-700 font-medium">₹{selectedTransaction.materialAmount.toLocaleString()}</Text>
            </View>
            
            <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
              <Text className="text-gray-800 font-bold">Total</Text>
              <Text className="text-gray-800 font-bold">₹{selectedTransaction.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        
        {/* Payments Section */}
        <View className="px-4">
          <Text className="text-lg font-semibold text-gray-800 mb-2">Payments</Text>
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            {selectedTransaction.payments.map((payment, index) => (
              <View key={index} className="flex-row justify-between mb-2">
                <Text className="text-gray-700">{payment.date}</Text>
                <Text className="text-green-600 font-medium">₹{payment.amount.toLocaleString()}</Text>
              </View>
            ))}
            
            <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
              <Text className="text-gray-700 font-medium">Total Paid</Text>
              <Text className="text-green-600 font-medium">
                ₹{selectedTransaction.payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </Text>
            </View>
            
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
          <TouchableOpacity 
            className="bg-blue-600 p-2 rounded-full"
            onPress={handleAddTransaction}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
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
