import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';

// Import Firebase services
import { getVendors, getVendorTransactions, getSingleVendorOutstandingBalance } from '../../Firebase/vendorService';
import { getVendorRemainingBalance } from '../../Firebase/vendorPaymentService.js';

// Define types for Firebase service responses
interface FirebaseResponse<T> {
  data: T;
  error: string | null;
}

interface Payment {
  id: string;
  vendor_id: string;
  vendor_name: string;
  date: string;
  amount: number;
  createdAt?: any;
  updatedAt?: any;
}

// Define interfaces for our data structures
// Firebase data structure for vendor transaction items
interface FirebaseVendorTransactionItem {
  name: string;
  quantity: number | string;
  unit_price: number | string;
}

interface VendorTransaction {
  id: string;
  date: string;
  items: Array<{
    name: string;
    quantity: string;
    unitPrice: string;
  }>;
  materialAmount: number;
  transportCharge: number;
  totalAmount: number;
}

interface Vendor {
  id: string;
  name: string;
  totalSpent: number;
  totalOwed: number;
  remainingBalance?: number;
  lastTransactionDate?: string;
  transactions: VendorTransaction[];
  payments?: Payment[];
}

// We'll fetch real vendor data from Firebase instead of using dummy data

export default function VendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorTransactions, setVendorTransactions] = useState<VendorTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch vendors from Firebase
  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const result = await getVendors();
      
      if (result.error) {
        console.error('Error fetching vendors:', result.error);
        setVendors([]);
        setIsLoading(false);
        return;
      }
      
      // Transform the data to match our Vendor interface
      const vendorsList: Vendor[] = await Promise.all(result.data.map(async (vendor) => {
        // Get outstanding balance for each vendor
        const balanceResult = await getSingleVendorOutstandingBalance(vendor.id);
        const totalOwed = balanceResult.error ? 0 : balanceResult.data;
        
        // Get all transactions to calculate total spent and get the latest transaction date
        const transactionsResult = await getVendorTransactions(vendor.id);
        let totalSpent = 0;
        let latestTransactionDate = '';
        
        if (!transactionsResult.error && transactionsResult.data.length > 0) {
          // Sum up all transaction total amounts
          totalSpent = transactionsResult.data.reduce(
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
        
        // Get remaining balance after payments
        const remainingBalanceResult = await getVendorRemainingBalance(vendor.id) as FirebaseResponse<number>;
        const remainingBalance = remainingBalanceResult.error ? totalOwed : remainingBalanceResult.data;
        
        // Define empty payments array for type safety
        const payments: Payment[] = [];
        
        return {
          id: vendor.id,
          name: vendor.name,
          totalSpent: totalSpent,
          totalOwed: totalOwed,
          remainingBalance: remainingBalance,
          lastTransactionDate: latestTransactionDate,
          payments: payments,
          transactions: [] // We'll load transactions only when a vendor is selected
        };
      }));
      
      setVendors(vendorsList);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);
  
  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchVendors();
  };

  const handleAddTransaction = () => {
    router.push('/forms/vendor-transaction-form');
  };

  const handleVendorSelect = async (vendor: Vendor) => {
    try {
      setSelectedVendor(vendor);
      setLoadingTransactions(true);
      
      // Fetch transactions for the selected vendor
      const result = await getVendorTransactions(vendor.id);
      
      if (result.error) {
        console.error('Error fetching vendor transactions:', result.error);
        return;
      }
      
      // Transform the data to match our VendorTransaction interface
      const transformedTransactions: VendorTransaction[] = result.data.map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        items: transaction.items.map((item: FirebaseVendorTransactionItem) => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unitPrice: item.unit_price.toString()
        })),
        materialAmount: transaction.material_amount,
        transportCharge: transaction.transport_charge || 0,
        totalAmount: transaction.total_amount
      }));
      
      setSelectedVendor(vendor);
      setVendorTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error selecting vendor:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleBackToList = () => {
    setSelectedVendor(null);
    setVendorTransactions([]);
  };

  // Vendor List View
  const renderVendorList = () => (
    <>
      {/* Search Bar */}
      <View className="px-4 py-2">
        <View className="bg-white flex-row items-center px-3 py-2 rounded-lg border border-gray-300">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search vendors..."
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
      
      {/* Vendors List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ca7353" />
          <Text className="mt-2 text-gray-600">Loading vendors...</Text>
        </View>
      ) : filteredVendors.length > 0 ? (
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.id}
          className="px-4 pt-2"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#ca7353"]}
              tintColor="#ca7353"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
              onPress={() => handleVendorSelect(item)}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
                  {item.lastTransactionDate && (
                    <Text className="text-sm text-gray-500">
                      Last transaction: {item.lastTransactionDate}
                    </Text>
                  )}
                  {item.remainingBalance !== undefined && item.remainingBalance > 0 && (
                    <Text className="text-sm text-red-600 font-medium mt-1">
                      Outstanding: ₹{item.remainingBalance.toLocaleString()}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-4">
          <View className="w-64 h-64 mb-4">
            <LottieView
              source={require('../../assets/animations/empty_vendors.json')}
              autoPlay
              loop
            />
          </View>
          <Text className="text-lg text-gray-600 text-center mb-6">No vendors found</Text>
          <TouchableOpacity 
            className="bg-blue-600 px-6 py-3 rounded-lg"
            onPress={handleAddTransaction}
          >
            <Text className="text-white font-semibold">Add First Vendor</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // Vendor Detail View
  const renderVendorDetail = () => {
    if (!selectedVendor) return null;
    
    return (
      <View className="flex-1">
        {/* Back Button */}
        <TouchableOpacity 
          className="flex-row items-center px-4 py-2"
          onPress={handleBackToList}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text className="ml-2 text-gray-700">Back to Vendors</Text>
        </TouchableOpacity>
        
        {/* Vendor Info */}
        <View className="bg-white mx-4 mt-2 p-4 rounded-xl shadow-sm">
          <Text className="text-2xl font-bold text-gray-800">{selectedVendor.name}</Text>
          
          <View className="flex-row justify-between mt-4">
            <View>
              <Text className="text-gray-500">Total Spent</Text>
              <Text className="text-xl font-bold text-gray-800">₹{selectedVendor.totalSpent?.toLocaleString() || '0'}</Text>
            </View>
            <View>
              <Text className="text-gray-500">Outstanding</Text>
              <Text className="text-xl font-bold text-red-600">₹{selectedVendor.remainingBalance?.toLocaleString() || '0'}</Text>
            </View>
          </View>
          
          {/* Payments Button */}
          <TouchableOpacity
            className="bg-green-600 px-4 py-2 rounded-lg mt-4 flex-row justify-center items-center"
            onPress={() => router.push({
              pathname: '/tabs/vendorPayments',
              params: { vendorId: selectedVendor.id, vendorName: selectedVendor.name }
            })}
          >
            <Ionicons name="cash-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">View Payments</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          className="flex-1 mt-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => handleVendorSelect(selectedVendor)}
              colors={['#ca7353']}
            />
          }
        >
          
          {/* Transaction List */}
          <Text className="px-4 text-lg font-semibold text-gray-800 mb-2">Transaction History</Text>
          
          {loadingTransactions ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#ca7353" />
              <Text className="mt-2 text-gray-600">Loading transactions...</Text>
            </View>
          ) : vendorTransactions.length > 0 ? (
            <FlatList
              data={vendorTransactions}
              keyExtractor={(item) => item.id}
              className="px-4"
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="font-medium text-gray-800">{item.date}</Text>
                    <Text className="font-bold text-gray-800">₹{item.totalAmount.toLocaleString()}</Text>
                  </View>
                  
                  {/* Items */}
                  {item.items.map((product, index) => (
                    <View key={index} className="flex-row justify-between mb-1">
                      <Text className="text-gray-600">
                        {product.name} ({product.quantity} × ₹{product.unitPrice})
                      </Text>
                      <Text className="text-gray-600">
                        ₹{(parseFloat(product.quantity) * parseFloat(product.unitPrice)).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                  
                  {/* Additional Charges */}
                  {item.transportCharge > 0 && (
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-600">Transport Charge</Text>
                      <Text className="text-gray-600">₹{item.transportCharge.toLocaleString()}</Text>
                    </View>
                  )}
                </View>
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
          <Text className="text-xl font-bold text-gray-800">Vendors</Text>
        </View>
      </View>
      
      {/* Content */}
      {selectedVendor ? renderVendorDetail() : renderVendorList()}
      
      {/* Custom Tab Bar with Animations */}
      <CustomTabBar />
    </View>
  );
}
