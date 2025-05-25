import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';
import ErrorBoundary from '../../components/ErrorBoundary';

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

export default function VendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorTransactions, setVendorTransactions] = useState<VendorTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Pagination state
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Transaction pagination state
  const [lastVisibleTransaction, setLastVisibleTransaction] = useState<any>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch vendors from Firebase with pagination
  const fetchVendors = async (refresh = false) => {
    try {
      if (refresh) {
        setIsLoading(true);
        setLastVisible(null);
        setHasMore(true);
      } else if (!hasMore) {
        return;
      }

      setLoadingMore(!refresh);

      // Use regular service for now - we'll replace with optimized queries later
      const result = await getVendors();
      
      if (result.error) {
        console.error('Error fetching vendors:', result.error);
        setVendors([]);
        return;
      }
      
      // Process the vendors data
      const vendorsList: Vendor[] = await Promise.all(result.data.map(async (vendor) => {
        // Get outstanding balance for each vendor
        const balanceResult = await getSingleVendorOutstandingBalance(vendor.id);
        const totalOwed = balanceResult.error ? 0 : balanceResult.data;
        
        // Get remaining balance after payments
        const remainingBalanceResult = await getVendorRemainingBalance(vendor.id) as FirebaseResponse<number>;
        const remainingBalance = remainingBalanceResult.error ? totalOwed : remainingBalanceResult.data;
        
        return {
          id: vendor.id,
          name: vendor.name,
          totalSpent: vendor.totalSpent || 0,
          totalOwed: totalOwed,
          remainingBalance: remainingBalance,
          lastTransactionDate: vendor.lastTransactionDate || '',
          payments: [],
          transactions: [] // We'll load transactions only when a vendor is selected
        };
      }));
      
      // Update the state based on whether this is a refresh or loading more
      if (refresh) {
        setVendors(vendorsList);
      } else {
        setVendors([...vendors, ...vendorsList]);
      }
      
      // For demonstration purposes, set pagination values
      setHasMore(vendorsList.length >= 10);
      
    } catch (error) {
      console.error('Error fetching vendors:', error);
      Alert.alert('Error', 'Failed to load vendors. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors(true);
  }, []);
  
  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchVendors(true);
  };
  
  // Handle loading more vendors when reaching the end of the list
  const loadMoreVendors = useCallback(() => {
    if (!isLoading && !loadingMore && hasMore) {
      fetchVendors(false);
    }
  }, [isLoading, loadingMore, hasMore]);

  const handleAddTransaction = () => {
    router.push('/forms/vendor-transaction-form');
  };

  const handleVendorSelect = async (vendor: Vendor) => {
    try {
      setSelectedVendor(vendor);
      setLoadingTransactions(true);
      setVendorTransactions([]);
      
      // Fetch transactions for the selected vendor
      const result = await getVendorTransactions(vendor.id);
      
      if (result.error) {
        console.error('Error fetching vendor transactions:', result.error);
        return;
      }
      
      // Transform the data to match our VendorTransaction interface
      const transformedTransactions: VendorTransaction[] = result.data.map((transaction: any) => ({
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
      
      setVendorTransactions(transformedTransactions);
      
      // For demonstration purposes, set pagination values
      setHasMoreTransactions(transformedTransactions.length >= 10);
      
    } catch (error) {
      console.error('Error selecting vendor:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Load more transactions when reaching the end of the transactions list
  const loadMoreTransactions = useCallback(() => {
    if (!loadingTransactions && !loadingMoreTransactions && hasMoreTransactions && selectedVendor) {
      // In the future, this will load more transactions with pagination
      console.log('Would load more transactions here');
    }
  }, [loadingTransactions, loadingMoreTransactions, hasMoreTransactions, selectedVendor]);
  
  const handleBackToList = () => {
    setSelectedVendor(null);
  };

  return (
    <ErrorBoundary>
      <View className="flex-1" style={{ backgroundColor: '#f5e9e2' }}>
        <StatusBar style="auto" />
        
        {/* Main content */}
        {/* Header */}
        <View className="bg-white pt-16 pb-4 px-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-800">Vendors</Text>
        </View>
        
        <View className="flex-1 p-4">
          {/* Search bar */}
          <View className="flex-row items-center mb-4 bg-white rounded-lg px-3 py-2 shadow-sm">
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              className="flex-1 ml-2"
              placeholder="Search vendors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {isLoading && vendors.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : selectedVendor ? (
            <View className="flex-1">
              {/* Vendor detail view */}
              <View className="flex-row items-center mb-4">
                <TouchableOpacity 
                  onPress={handleBackToList}
                  className="mr-2"
                >
                  <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800">{selectedVendor.name}</Text>
              </View>
              
              {/* Vendor stats */}
              <View className="flex-row justify-between mb-4">
                <View className="bg-blue-50 p-4 rounded-xl flex-1 mr-2 shadow-sm">
                  <Text className="text-blue-700 font-medium">Total Spent</Text>
                  <Text className="text-xl font-bold text-blue-700">
                    ₹{selectedVendor.totalSpent.toLocaleString()}
                  </Text>
                </View>
                <View className="bg-red-50 p-4 rounded-xl flex-1 ml-2 shadow-sm">
                  <Text className="text-red-600 font-medium">Outstanding</Text>
                  <Text className="text-xl font-bold text-red-600">
                    ₹{selectedVendor.remainingBalance?.toLocaleString() || '0'}
                  </Text>
                </View>
              </View>
              
              {/* Transactions list */}
              <Text className="text-lg font-bold mb-2 text-gray-800">Transactions</Text>
              
              {loadingTransactions ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#0000ff" />
                </View>
              ) : vendorTransactions.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                  <Text>No transactions found</Text>
                </View>
              ) : (
                <FlatList
                  data={vendorTransactions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm">
                      <Text className="font-bold text-gray-800">{new Date(item.date).toLocaleDateString()}</Text>
                      <View className="mt-2 mb-2">
                        <Text className="text-gray-500 text-sm">Total Amount</Text>
                        <Text className="text-gray-800 font-bold">₹{item.totalAmount.toLocaleString()}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <View>
                          <Text className="text-gray-500 text-sm">Material</Text>
                          <Text className="text-gray-800 font-medium">₹{item.materialAmount.toLocaleString()}</Text>
                        </View>
                        {item.transportCharge > 0 && (
                          <View>
                            <Text className="text-gray-500 text-sm">Transport</Text>
                            <Text className="text-gray-800 font-medium">₹{item.transportCharge.toLocaleString()}</Text>
                          </View>
                        )}
                      </View>
                      <Text className="mt-3 font-medium text-gray-800">Items:</Text>
                      {item.items.map((itemDetail, index) => (
                        <Text key={index} className="text-sm">
                          {itemDetail.name} - {itemDetail.quantity} x ₹{itemDetail.unitPrice}
                        </Text>
                      ))}
                    </View>
                  )}
                  onEndReached={loadMoreTransactions}
                  onEndReachedThreshold={0.5}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                />
              )}
            </View>
          ) : vendors.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <LottieView
                source={require('../../assets/animations/empty_vendors.json')}
                autoPlay
                loop
                style={{ width: 200, height: 200 }}
              />
              <Text className="text-lg font-semibold mt-4 mb-2">No vendors yet</Text>
              <Text className="text-center text-gray-500 mb-4">
                Add your first vendor transaction to get started
              </Text>
              <TouchableOpacity
                onPress={handleAddTransaction}
                className="bg-gradient-to-r from-pink-500 to-orange-500 py-3 px-6 rounded-full"
              >
                <Text className="text-white font-bold">Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredVendors}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => handleVendorSelect(item)}
                  className="bg-white p-4 rounded-xl mb-3 shadow-sm"
                >
                  <Text className="text-lg font-bold">{item.name}</Text>
                  <View className="flex-row justify-between mt-2">
                    <View>
                      <Text className="text-gray-500 text-sm">Total Spent</Text>
                      <Text className="text-gray-800 font-bold">₹{item.totalSpent.toLocaleString()}</Text>
                    </View>
                    <View>
                      <Text className="text-gray-500 text-sm">Outstanding</Text>
                      <Text className="font-bold text-red-600">₹{item.remainingBalance?.toLocaleString() || '0'}</Text>
                    </View>
                  </View>
                  {item.lastTransactionDate && (
                    <View className="mt-2 flex-row items-center">
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text className="text-xs text-gray-500 ml-1">
                        Last transaction: {new Date(item.lastTransactionDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              onEndReached={loadMoreVendors}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                />
              }
            />
          )}
        </View>
        
        {/* Add button (only show when not in detail view) */}
        {!selectedVendor && (
          <TouchableOpacity
            onPress={handleAddTransaction}
            className="absolute bottom-20 right-6 bg-gradient-to-r from-pink-500 to-orange-500 w-14 h-14 rounded-full justify-center items-center shadow-lg"
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        )}
        
        {/* Custom Tab Bar */}
        <CustomTabBar />
      </View>
    </ErrorBoundary>
  );
}