import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';

// Import Auth Context
import { useAuth } from '../../Firebase/AuthContext';
import { User } from 'firebase/auth';

// Import Firebase services
import { 
  getMonthlySummary, 
  calculateMonthlySummary 
} from '../../Firebase/summaryService';
import { getVendorOutstandingBalance } from '../../Firebase/vendorService';
import { getCustomerOutstandingBalance } from '../../Firebase/customerService';

// Define interfaces for our data structures
interface MonthlySummary {
  monthly_income: number;
  monthly_expenses: number;
  net_balance: number;
  year?: number;
  month?: number;
  vendor_transaction_count?: number;
  customer_transaction_count?: number;
  vendor_payment_count?: number;
  customer_payment_count?: number;
  top_vendors?: Array<{id: string; name: string; amount: number}>;
  top_customers?: Array<{id: string; name: string; amount: number}>;
}

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser } = useAuth(); // Get current user from auth context
  const [fabOpen, setFabOpen] = useState(false);
  const animation = useRef<LottieView>(null);
  const welcomeAnimation = useRef<LottieView>(null);
  
  // Cast currentUser to Firebase User type
  const user = currentUser as User | null;
  
  // State for data from Firebase
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendorOutstanding, setVendorOutstanding] = useState(0);
  const [customerOutstanding, setCustomerOutstanding] = useState(0);
  
  // Get current year and month for initial state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // JavaScript months are 0-indexed
  
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({
    monthly_income: 0,
    monthly_expenses: 0,
    net_balance: 0,
    vendor_transaction_count: 0,
    customer_transaction_count: 0,
    vendor_payment_count: 0,
    customer_payment_count: 0,
    top_vendors: [],
    top_customers: []
  });
  
  // Fetch data from Firebase
  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }
      
      // Fetch vendor outstanding balance
      const vendorResult = await getVendorOutstandingBalance();
      if (!vendorResult.error) {
        setVendorOutstanding(vendorResult.data);
      }
      
      // Fetch customer outstanding balance
      const customerResult = await getCustomerOutstandingBalance();
      if (!customerResult.error) {
        setCustomerOutstanding(customerResult.data);
      }
      
      // First calculate the monthly summary to ensure it's up-to-date
      console.log(`Calculating summary for ${selectedYear}-${selectedMonth}`);
      await calculateMonthlySummary(selectedYear, selectedMonth);
      
      // Then fetch the updated monthly summary
      const summaryResult = await getMonthlySummary(selectedYear, selectedMonth);
      if (!summaryResult.error && summaryResult.data) {
        setMonthlySummary({
          monthly_income: summaryResult.data.monthly_income || 0,
          monthly_expenses: summaryResult.data.monthly_expenses || 0,
          net_balance: summaryResult.data.net_balance || 0,
          year: selectedYear,
          month: selectedMonth,
          vendor_transaction_count: summaryResult.data.vendor_transaction_count || 0,
          customer_transaction_count: summaryResult.data.customer_transaction_count || 0,
          vendor_payment_count: summaryResult.data.vendor_payment_count || 0,
          customer_payment_count: summaryResult.data.customer_payment_count || 0,
          top_vendors: summaryResult.data.top_vendors || [],
          top_customers: summaryResult.data.top_customers || []
        });
      } else {
        console.log('No summary data found, using zeros');
        setMonthlySummary({
          monthly_income: 0,
          monthly_expenses: 0,
          net_balance: 0,
          year: selectedYear,
          month: selectedMonth,
          vendor_transaction_count: 0,
          customer_transaction_count: 0,
          vendor_payment_count: 0,
          customer_payment_count: 0,
          top_vendors: [],
          top_customers: []
        });
      }
    } catch (error) {
      console.error('Error fetching home screen data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  // Change month for summary
  const changeMonth = async (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;
    
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        newMonth = 12;
        newYear = selectedYear - 1;
      } else {
        newMonth = selectedMonth - 1;
      }
    } else { // next
      if (selectedMonth === 12) {
        newMonth = 1;
        newYear = selectedYear + 1;
      } else {
        newMonth = selectedMonth + 1;
      }
    }
    
    // Don't allow future months
    const currentDate = new Date();
    if (newYear > currentDate.getFullYear() || 
        (newYear === currentDate.getFullYear() && newMonth > currentDate.getMonth() + 1)) {
      return;
    }
    
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    
    // Show loading state
    setIsLoading(true);
    
    try {
      // First calculate the summary to ensure it's up-to-date
      console.log(`Calculating summary for ${newYear}-${newMonth}`);
      await calculateMonthlySummary(newYear, newMonth);
      
      // Then fetch the updated summary
      const result = await getMonthlySummary(newYear, newMonth);
      if (!result.error && result.data) {
        setMonthlySummary({
          monthly_income: result.data.monthly_income || 0,
          monthly_expenses: result.data.monthly_expenses || 0,
          net_balance: result.data.net_balance || 0,
          year: newYear,
          month: newMonth
        });
      } else {
        // Reset summary if no data found
        console.log('No summary data found for new month, using zeros');
        setMonthlySummary({
          monthly_income: 0,
          monthly_expenses: 0,
          net_balance: 0,
          year: newYear,
          month: newMonth
        });
      }
    } catch (error) {
      console.error('Error changing month:', error);
      // Reset summary on error
      setMonthlySummary({
        monthly_income: 0,
        monthly_expenses: 0,
        net_balance: 0,
        year: newYear,
        month: newMonth
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
  };
  
  useEffect(() => {
    // Auto play the animations when component mounts
    if (animation.current) {
      animation.current.play();
    }
    
    if (welcomeAnimation.current) {
      welcomeAnimation.current.play();
    }
    
    // Fetch data when component mounts
    fetchData();
  }, []);

  const toggleFab = () => {
    setFabOpen(!fabOpen);
  };

  const handleVendorTransaction = () => {
    setFabOpen(false);
    router.push('/forms/vendor-transaction-form');
  };

  const handleCustomerTransaction = () => {
    setFabOpen(false);
    router.push('/forms/customer-transaction-form');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#f5e9e2' }}>
      <StatusBar style="dark" />
      
      {/* Animated Welcome Header */}
      <View className="bg-white pt-16 pb-6 px-4 mb-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-1">
            <Text className="text-sm text-gray-500">Welcome back</Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-2xl font-bold text-gray-800">
                {user?.displayName || 'User'}
              </Text>
              <LottieView
                ref={welcomeAnimation}
                source={require('../../assets/animations/waving_hand.json')}
                style={{ width: 30, height: 30, marginLeft: 8, marginBottom: 2 }}
                loop={true}
              />
            </View>
          </View>
          <View className="bg-pink-100 p-3 rounded-full">
            <Ionicons name="analytics-outline" size={24} color="#d88c9a" />
          </View>
        </View>
        <View className="h-1 w-20 bg-pink-200 rounded-full mt-1" />
      </View>
      
      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ca7353']} // Android
            tintColor="#ca7353" // iOS
            title="Refreshing data..." // iOS
          />
        }
      >
        {/* Outstanding Balances Section */}
        <View className="flex-row items-center mb-3">
          <Text className="text-xl font-bold text-gray-800">Outstanding Balances</Text>
          <View className="h-1 w-16 bg-pink-200 rounded-full ml-3 mt-1" />
        </View>
        
        {isLoading ? (
          <View className="flex-row justify-between mb-6 items-center">
            <ActivityIndicator size="large" color="#ca7353" />
            <Text className="ml-2 text-gray-600">Loading balances...</Text>
          </View>
        ) : (
          <View className="flex-row justify-between mb-6">
            {/* Vendor Card */}
            <View className="bg-white rounded-xl p-4 shadow-md w-[48%]">
              <View className="flex-row items-center mb-2">
                <View className="bg-orange-100 p-2 rounded-full mr-2">
                  <Ionicons name="cube-outline" size={24} color="#f97316" />
                </View>
                <Text className="font-semibold text-gray-700">Vendors</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800">₹{vendorOutstanding.toLocaleString()}</Text>
              <Text className="text-sm text-gray-500">Total Owed</Text>
            </View>
            
            {/* Customer Card */}
            <View className="bg-white rounded-xl p-4 shadow-md w-[48%]">
              <View className="flex-row items-center mb-2">
                <View className="bg-blue-100 p-2 rounded-full mr-2">
                  <Ionicons name="person-outline" size={24} color="#3b82f6" />
                </View>
                <Text className="font-semibold text-gray-700">Customers</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800">₹{customerOutstanding.toLocaleString()}</Text>
              <Text className="text-sm text-gray-500">Total Due</Text>
            </View>
          </View>
        )}

        {/* Monthly Summary Section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xl font-bold text-gray-800">Monthly Summary</Text>
          
          {/* Month Selector */}
          <View className="flex-row items-center bg-white rounded-lg px-2 py-1 shadow-sm">
            <TouchableOpacity onPress={() => changeMonth('prev')} className="p-1">
              <Ionicons name="chevron-back" size={20} color="#666" />
            </TouchableOpacity>
            
            <Text className="mx-2 font-medium text-gray-700">
              {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'short' })} {selectedYear}
            </Text>
            
            <TouchableOpacity 
              onPress={() => changeMonth('next')} 
              className="p-1"
              disabled={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()}
            >
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear() ? '#ccc' : '#666'} 
              />
            </TouchableOpacity>
          </View>
        </View>
        {isLoading ? (
          <View className="bg-white rounded-xl p-4 shadow-md mb-6 items-center justify-center">
            <ActivityIndicator size="large" color="#ca7353" />
            <Text className="mt-2 text-gray-600">Loading summary...</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl p-4 shadow-md mb-6">
            <View className="flex-row justify-between mb-4">
              {/* Income */}
              <View className="flex-row items-center">
                <View className="bg-green-100 p-2 rounded-full mr-2">
                  <Ionicons name="trending-up" size={24} color="#22c55e" />
                </View>
                <View>
                  <Text className="font-semibold text-gray-700">Income</Text>
                  <Text className="text-xl font-bold text-green-600">₹{monthlySummary.monthly_income.toLocaleString()}</Text>
                </View>
              </View>
              
              {/* Expenses */}
              <View className="flex-row items-center">
                <View className="bg-red-100 p-2 rounded-full mr-2">
                  <Ionicons name="trending-down" size={24} color="#ef4444" />
                </View>
                <View>
                  <Text className="font-semibold text-gray-700">Expenses</Text>
                  <Text className="text-xl font-bold text-red-600">₹{monthlySummary.monthly_expenses.toLocaleString()}</Text>
                </View>
              </View>
            </View>
            
            {/* Net Balance */}
            <View className="border-t border-gray-200 pt-3 flex-row justify-between items-center">
              <Text className="font-semibold text-gray-700">Net Balance</Text>
              <View className="flex-row items-center">
                {monthlySummary.net_balance >= 0 ? (
                  <View className="bg-green-100 px-2 py-1 rounded-full mr-2">
                    <Text className="text-green-700 font-medium">+₹{monthlySummary.net_balance.toLocaleString()}</Text>
                  </View>
                ) : (
                  <View className="bg-red-100 px-2 py-1 rounded-full mr-2">
                    <Text className="text-red-700 font-medium">-₹{Math.abs(monthlySummary.net_balance).toLocaleString()}</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Activity Summary */}
            <View className="border-t border-gray-200 mt-3 pt-3">
              <Text className="font-semibold text-gray-700 mb-2">Activity Summary</Text>
              <View className="flex-row justify-between">
                <View className="bg-gray-50 rounded-lg p-2 flex-1 mr-2">
                  <Text className="text-xs text-gray-500">Vendor Transactions</Text>
                  <Text className="font-medium">{monthlySummary.vendor_transaction_count}</Text>
                </View>
                <View className="bg-gray-50 rounded-lg p-2 flex-1 mr-2">
                  <Text className="text-xs text-gray-500">Customer Transactions</Text>
                  <Text className="font-medium">{monthlySummary.customer_transaction_count}</Text>
                </View>
                <View className="bg-gray-50 rounded-lg p-2 flex-1">
                  <Text className="text-xs text-gray-500">Payments</Text>
                  <Text className="font-medium">{(monthlySummary.vendor_payment_count || 0) + (monthlySummary.customer_payment_count || 0)}</Text>
                </View>
              </View>
            </View>
            
            {/* Top Vendors & Customers */}
            {((monthlySummary.top_vendors && monthlySummary.top_vendors.length > 0) || (monthlySummary.top_customers && monthlySummary.top_customers.length > 0)) && (
              <View className="border-t border-gray-200 mt-3 pt-3">
                <View className="flex-row justify-between">
                  {/* Top Vendors */}
                  {monthlySummary.top_vendors && monthlySummary.top_vendors.length > 0 && (
                    <View className="flex-1 mr-2">
                      <Text className="font-semibold text-gray-700 mb-1">Top Vendors</Text>
                      {monthlySummary.top_vendors.map((vendor, index) => (
                        <View key={vendor.id} className="flex-row justify-between mb-1">
                          <Text className="text-xs text-gray-600" numberOfLines={1}>{index + 1}. {vendor.name}</Text>
                          <Text className="text-xs font-medium">₹{vendor.amount.toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Top Customers */}
                  {monthlySummary.top_customers && monthlySummary.top_customers.length > 0 && (
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-700 mb-1">Top Customers</Text>
                      {monthlySummary.top_customers.map((customer, index) => (
                        <View key={customer.id} className="flex-row justify-between mb-1">
                          <Text className="text-xs text-gray-600" numberOfLines={1}>{index + 1}. {customer.name}</Text>
                          <Text className="text-xs font-medium">₹{customer.amount.toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Home Screen Animation */}
        <View className="items-center justify-center my-6 pt-5">
          <LottieView
            ref={animation}
            source={require('../../assets/animations/home_Screen.json')}
            style={{ width: Dimensions.get('window').width * 0.8, height: 200 }}
            autoPlay
            loop
          />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-20 right-6">
        <TouchableOpacity
          onPress={toggleFab}
          className={`bg-amber-800 w-14 h-14 rounded-full justify-center items-center shadow-lg ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </View>

      {/* FAB Modal */}
      {fabOpen && (
        <View className="absolute inset-0 bg-black bg-opacity-50" style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={toggleFab}
            activeOpacity={1}
          >
            <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark">
              <View className="flex-1 justify-end items-end pb-24 pr-6">
                {/* Vendor Transaction Option */}
                <TouchableOpacity
                  onPress={handleVendorTransaction}
                  className="bg-white rounded-xl p-4 mb-4 flex-row items-center shadow-md"
                  style={{ width: 220 }}
                >
                  <View className="bg-orange-100 p-2 rounded-full mr-3">
                    <Ionicons name="cube-outline" size={24} color="#f97316" />
                  </View>
                  <Text className="text-gray-800 font-semibold text-lg">Vendor Transaction</Text>
                </TouchableOpacity>

                {/* Customer Transaction Option */}
                <TouchableOpacity
                  onPress={handleCustomerTransaction}
                  className="bg-white rounded-xl p-4 mb-4 flex-row items-center shadow-md"
                  style={{ width: 220 }}
                >
                  <View className="bg-blue-100 p-2 rounded-full mr-3">
                    <Ionicons name="person-outline" size={24} color="#3b82f6" />
                  </View>
                  <Text className="text-gray-800 font-semibold text-lg">Customer Transaction</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Tab Bar with Animations */}
      <CustomTabBar />
    </View>
  );
}
