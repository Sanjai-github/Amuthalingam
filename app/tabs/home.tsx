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
  net_balance: number; // This maps to monthly_net_balance in Firebase
  monthly_net_balance?: number; // Adding this for compatibility with Firebase data
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
  
  // State for horizontal scrolling
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Handle horizontal scroll with smoother detection
  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageWidth = Dimensions.get('window').width;
    // Calculate current page with better precision
    const currentPage = Math.floor(contentOffsetX / pageWidth + 0.5);
    setCurrentPage(currentPage);
    
    // We've removed the auto-snap logic to make scrolling smoother
    // The pagingEnabled property will handle the snapping naturally
  };

  // Function to scroll to a specific page with smoother animation
  const scrollToPage = (pageIndex: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: pageIndex * Dimensions.get('window').width,
        animated: true
      });
      setCurrentPage(pageIndex); // Update page immediately for better UX
    }
  };
  
  // Fetch data from Firebase
  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }
      
      // Fetch vendor outstanding balance
      const vendorResult = await getVendorOutstandingBalance();
      if ('error' in vendorResult && !vendorResult.error) {
        setVendorOutstanding(vendorResult.data);
      }
      
      // Fetch customer outstanding balance
      const customerResult = await getCustomerOutstandingBalance();
      if ('error' in customerResult && !customerResult.error) {
        setCustomerOutstanding(customerResult.data);
      }
      
      // First calculate the monthly summary to ensure it's up-to-date
      //console.log(`Calculating summary for ${selectedYear}-${selectedMonth}`);
      await calculateMonthlySummary(selectedYear, selectedMonth);
      
      // Then fetch the updated monthly summary
      const summaryResult = await getMonthlySummary(selectedYear, selectedMonth);
      // Check if summaryResult is an object with data property
      if (summaryResult && typeof summaryResult === 'object' && 'data' in summaryResult && summaryResult.data) {
        setMonthlySummary({
          monthly_income: summaryResult.data.monthly_income || 0,
          monthly_expenses: summaryResult.data.monthly_expenses || 0,
          net_balance: summaryResult.data.monthly_net_balance || (summaryResult.data.monthly_income - summaryResult.data.monthly_expenses) || 0,
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
      //console.log(`Calculating summary for ${newYear}-${newMonth}`);
      await calculateMonthlySummary(newYear, newMonth);
      
      // Then fetch the updated summary
      const result = await getMonthlySummary(newYear, newMonth);
      if ('error' in result && !result.error && 'data' in result && result.data) {
        setMonthlySummary({
          monthly_income: result.data.monthly_income || 0,
          monthly_expenses: result.data.monthly_expenses || 0,
          net_balance: result.data.monthly_net_balance || (result.data.monthly_income - result.data.monthly_expenses) || 0, // Maps to monthly_net_balance in Firebase
          year: newYear,
          month: newMonth,
          vendor_transaction_count: result.data.vendor_transaction_count || 0,
          customer_transaction_count: result.data.customer_transaction_count || 0,
          vendor_payment_count: result.data.vendor_payment_count || 0,
          customer_payment_count: result.data.customer_payment_count || 0,
          top_vendors: result.data.top_vendors || [],
          top_customers: result.data.top_customers || []
        });
      } else {
        // Reset summary if no data found
        console.log('No summary data found for new month, using zeros');
        setMonthlySummary({
          monthly_income: 0,
          monthly_expenses: 0,
          net_balance: 0,
          year: newYear,
          month: newMonth,
          vendor_transaction_count: 0,
          customer_transaction_count: 0,
          vendor_payment_count: 0,
          customer_payment_count: 0,
          top_vendors: [],
          top_customers: []
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
        month: newMonth,
        vendor_transaction_count: 0,
        customer_transaction_count: 0,
        vendor_payment_count: 0,
        customer_payment_count: 0,
        top_vendors: [],
        top_customers: []
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
        {/* Page Indicator - Now Touchable */}
        <View className="flex-row justify-center mt-2 mb-1">
          <TouchableOpacity onPress={() => scrollToPage(0)}>
            <View className={`h-2 w-2 rounded-full mx-1 ${currentPage === 0 ? 'bg-amber-800' : 'bg-gray-300'}`} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToPage(1)}>
            <View className={`h-2 w-2 rounded-full mx-1 ${currentPage === 1 ? 'bg-amber-800' : 'bg-gray-300'}`} />
          </TouchableOpacity>
        </View>
        
        {/* Horizontal ScrollView for Monthly and Activity Summary */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          decelerationRate="normal"
          snapToAlignment="center"
          contentOffset={{ x: 0, y: 0 }}
          contentContainerStyle={{ width: Dimensions.get('window').width * 2 }}
          style={{ width: Dimensions.get('window').width }}
        >
          {/* Page 1: Monthly Summary */}
          <View style={{ width: Dimensions.get('window').width, paddingHorizontal: 16, paddingRight: 36 }} className="bg-[#FCEFE9] items-center">
            {/* Outstanding Balances */}
            <View className="flex-row justify-center w-full mt-4 max-w-md">
              <View className="bg-white rounded-xl p-4 shadow-sm flex-1 mr-2">
                <Text className="text-amber-800 font-bold text-lg">Vendor Balance</Text>
                <Text className="text-2xl font-bold mt-1">₹{vendorOutstanding.toLocaleString()}</Text>
                <Text className="text-xs text-gray-500 mt-1">Outstanding Amount</Text>
              </View>
              
              <View className="bg-white rounded-xl p-4 shadow-sm flex-1 ml-2">
                <Text className="text-amber-800 font-bold text-lg">Customer Balance</Text>
                <Text className="text-2xl font-bold mt-1">₹{customerOutstanding.toLocaleString()}</Text>
                <Text className="text-xs text-gray-500 mt-1">Outstanding Amount</Text>
              </View>
            </View>
            
            {/* Monthly Summary */}
            <View className="bg-white rounded-xl mt-4 p-4 shadow-md w-full max-w-md">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-amber-800 font-bold text-xl">Monthly Summary</Text>
                
                <View className="flex-row items-center">
                  <TouchableOpacity onPress={() => changeMonth('prev')} className="p-2">
                    <Ionicons name="chevron-back" size={20} color="#78716c" />
                  </TouchableOpacity>
                  
                  <Text className="text-gray-600 font-medium">
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'short' })} {selectedYear}
                  </Text>
                  
                  <TouchableOpacity onPress={() => changeMonth('next')} className="p-2">
                    <Ionicons name="chevron-forward" size={20} color="#78716c" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View className="flex-row justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-gray-500 text-sm">Income</Text>
                  <Text className="text-green-600 text-xl font-bold">₹{monthlySummary.monthly_income.toLocaleString()}</Text>
                </View>
                
                <View className="flex-1 items-center">
                  <Text className="text-gray-500 text-sm">Expenses</Text>
                  <Text className="text-red-500 text-xl font-bold">₹{monthlySummary.monthly_expenses.toLocaleString()}</Text>
                </View>
                
                <View className="flex-1 items-end">
                  <Text className="text-gray-500 text-sm">Net Balance</Text>
                  <Text 
                    className={`text-xl font-bold ${monthlySummary.net_balance >= 0 ? 'text-green-600' : 'text-red-500'}`}
                  >
                    ₹{monthlySummary.net_balance.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
            
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
          </View>
          
          {/* Page 2: Activity Summary */}
          <View style={{ width: Dimensions.get('window').width, paddingHorizontal: 16, paddingRight: 36 }} className="bg-[#FCEFE9] items-center">
            {/* Activity Summary Header with Month Selector */}
            <View className="bg-white rounded-xl mt-4 p-4 shadow-md w-full max-w-md">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-amber-800 font-bold text-xl">Activity Summary</Text>
                
                <View className="flex-row items-center">
                  <TouchableOpacity onPress={() => changeMonth('prev')} className="p-2">
                    <Ionicons name="chevron-back" size={20} color="#78716c" />
                  </TouchableOpacity>
                  
                  <Text className="text-gray-600 font-medium">
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'short' })} {selectedYear}
                  </Text>
                  
                  <TouchableOpacity onPress={() => changeMonth('next')} className="p-2">
                    <Ionicons name="chevron-forward" size={20} color="#78716c" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Activity Metrics */}
            <View className="mt-4 w-full max-w-md">
              <View className="flex-row justify-between flex-wrap">
                <View className="w-[48%] mb-4">
                  <View className="bg-orange-50 p-3 rounded-lg shadow-sm">
                    <View className="flex-row justify-between items-center">
                      <View className="bg-orange-100 p-2 rounded-full">
                        <Ionicons name="cube-outline" size={20} color="#f97316" />
                      </View>
                      <Text className="text-orange-800 font-bold text-lg">{monthlySummary.vendor_transaction_count}</Text>
                    </View>
                    <Text className="text-gray-600 text-xs mt-2">Vendor Transactions</Text>
                  </View>
                </View>
                
                <View className="w-[48%] mb-4">
                  <View className="bg-blue-50 p-3 rounded-lg shadow-sm">
                    <View className="flex-row justify-between items-center">
                      <View className="bg-blue-100 p-2 rounded-full">
                        <Ionicons name="person-outline" size={20} color="#3b82f6" />
                      </View>
                      <Text className="text-blue-800 font-bold text-lg">{monthlySummary.customer_transaction_count}</Text>
                    </View>
                    <Text className="text-gray-600 text-xs mt-2">Customer Transactions</Text>
                  </View>
                </View>
                
                <View className="w-[48%]">
                  <View className="bg-green-50 p-3 rounded-lg shadow-sm">
                    <View className="flex-row justify-between items-center">
                      <View className="bg-green-100 p-2 rounded-full">
                        <Ionicons name="cash-outline" size={20} color="#22c55e" />
                      </View>
                      <Text className="text-green-800 font-bold text-lg">{monthlySummary.vendor_payment_count}</Text>
                    </View>
                    <Text className="text-gray-600 text-xs mt-2">Vendor Payments</Text>
                  </View>
                </View>
                
                <View className="w-[48%]">
                  <View className="bg-purple-50 p-3 rounded-lg shadow-sm">
                    <View className="flex-row justify-between items-center">
                      <View className="bg-purple-100 p-2 rounded-full">
                        <Ionicons name="wallet-outline" size={20} color="#a855f7" />
                      </View>
                      <Text className="text-purple-800 font-bold text-lg">{monthlySummary.customer_payment_count}</Text>
                    </View>
                    <Text className="text-gray-600 text-xs mt-2">Customer Payments</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Top Vendors and Customers */}
            {((monthlySummary.top_vendors?.length ?? 0) > 0 || (monthlySummary.top_customers?.length ?? 0) > 0) && (
              <View className="bg-white rounded-xl mt-4 p-4 shadow-md w-full max-w-md">
                <Text className="text-amber-800 font-bold text-lg mb-2">Top Transactions</Text>
                <View className="flex-row justify-between">
                  {/* Top Vendors */}
                  <View className="w-[48%]">
                    <Text className="font-semibold text-gray-700 mb-1">Top Vendors</Text>
                    {monthlySummary.top_vendors && (monthlySummary.top_vendors?.length ?? 0) > 0 ? (
                      monthlySummary.top_vendors.map((vendor, index) => (
                        <View key={vendor.id} className="flex-row justify-between mb-1">
                          <Text className="text-xs text-gray-600 flex-1 mr-2" numberOfLines={1}>{index + 1}. {vendor.name}</Text>
                          <Text className="text-xs font-medium">₹{vendor.amount.toLocaleString()}</Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-xs text-gray-400 italic">No vendor data</Text>
                    )}
                  </View>
                  
                  {/* Top Customers */}
                  <View className="w-[48%]">
                    <Text className="font-semibold text-gray-700 mb-1">Top Customers</Text>
                    {monthlySummary.top_customers && (monthlySummary.top_customers?.length ?? 0) > 0 ? (
                      monthlySummary.top_customers.map((customer, index) => (
                        <View key={customer.id} className="flex-row justify-between mb-1">
                          <Text className="text-xs text-gray-600 flex-1 mr-2" numberOfLines={1}>{index + 1}. {customer.name}</Text>
                          <Text className="text-xs font-medium">₹{customer.amount.toLocaleString()}</Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-xs text-gray-400 italic">No customer data</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
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
