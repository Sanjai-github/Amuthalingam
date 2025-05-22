import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomTabBar from '../../components/CustomTabBar';

// Import Firebase services
import { getVendors } from '../../Firebase/vendorService';
import { getVendorPayments, addVendorPayment, getVendorRemainingBalance } from '../../Firebase/vendorPaymentService.js';

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

interface Vendor {
  id: string;
  name: string;
  totalSpent?: number;
  totalOwed?: number;
  remainingBalance?: number;
  lastTransactionDate?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  transactions?: any[];
}

export default function VendorPaymentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorPayments, setVendorPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  // Get vendor ID and name from URL params if available
  const urlVendorId = params.vendorId as string;
  const urlVendorName = params.vendorName as string;
  
  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());

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
      
      setVendors(result.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);
  
  // Auto-select vendor if ID is provided in URL params
  useEffect(() => {
    if (urlVendorId && vendors.length > 0) {
      // Find the vendor in our loaded vendors list
      const vendor = vendors.find(v => v.id === urlVendorId);
      
      if (vendor) {
        handleVendorSelect(vendor);
      } else if (urlVendorId && urlVendorName) {
        // If we have the ID and name but vendor isn't in our list yet,
        // create a temporary vendor object to select
        const tempVendor: Vendor = {
          id: urlVendorId,
          name: urlVendorName,
          totalSpent: 0,
          totalOwed: 0,
          transactions: []
        };
        handleVendorSelect(tempVendor);
      }
    }
  }, [urlVendorId, vendors]);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVendors();
  };

  const handleVendorSelect = async (vendor: Vendor) => {
    try {
      setSelectedVendor(vendor);
      setLoadingPayments(true);
      
      // Fetch payments for the selected vendor
      const paymentsResult = await getVendorPayments(vendor.id) as FirebaseResponse<Payment[]>;
      
      if (paymentsResult.error) {
        console.error('Error fetching vendor payments:', paymentsResult.error);
        setVendorPayments([]);
      } else {
        setVendorPayments(paymentsResult.data);
      }
      
      // Get updated remaining balance
      const balanceResult = await getVendorRemainingBalance(vendor.id) as FirebaseResponse<number>;
      if (!balanceResult.error) {
        // Update the selected vendor with the new balance
        setSelectedVendor({
          ...vendor,
          remainingBalance: balanceResult.data
        });
      }
    } catch (error) {
      console.error('Error selecting vendor:', error);
      setVendorPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };
  
  // Open payment modal
  const openPaymentModal = () => {
    if (!selectedVendor) return;
    
    // Initialize with today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${year}-${month}-${day}`;
    
    setPaymentDate(formattedToday);
    setDatePickerDate(today);
    setPaymentAmount('');
    setPaymentModalVisible(true);
  };
  
  // Handle date change from date picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      // Fix timezone issue by using local date methods
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setPaymentDate(formattedDate);
      setDatePickerDate(selectedDate);
    }
  };
  
  // Handle adding a payment
  const handleAddPayment = async () => {
    if (!selectedVendor) return;
    
    // Validate inputs
    if (!paymentDate) {
      Alert.alert('Error', 'Please select a payment date');
      return;
    }
    
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    
    setAddingPayment(true);
    
    try {
      // Prepare payment data
      const paymentData = {
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.name,
        date: paymentDate,
        amount: parseFloat(paymentAmount)
      };
      
      // Add payment
      const result = await addVendorPayment(paymentData) as FirebaseResponse<any>;
      
      if (result.error) {
        throw new Error(`Failed to add payment: ${result.error}`);
      }
      
      // Get updated remaining balance
      const balanceResult = await getVendorRemainingBalance(selectedVendor.id) as FirebaseResponse<number>;
      const updatedVendor = {
        ...selectedVendor,
        remainingBalance: balanceResult.error ? selectedVendor.remainingBalance : balanceResult.data
      };
      
      // Success
      Alert.alert(
        'Success', 
        'Payment added successfully!',
        [{ 
          text: 'OK', 
          onPress: () => {
            setPaymentModalVisible(false);
            // Refresh vendor payments to show updated data
            setSelectedVendor(updatedVendor);
            handleVendorSelect(updatedVendor);
          } 
        }]
      );
    } catch (error) {
      console.error('Error adding payment:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add payment');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleBackToList = () => {
    setSelectedVendor(null);
    setVendorPayments([]);
  };

  // Vendor List View
  const renderVendorList = () => {
    return (
      <View className="flex-1">
        {/* Search Bar */}
        <View className="px-4 py-2">
          <View className="bg-white rounded-lg flex-row items-center px-3 py-2 shadow-sm">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-gray-800"
              placeholder="Search vendors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        
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
                colors={['#ca7353']}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                onPress={() => handleVendorSelect(item)}
              >
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
                    {item.lastPaymentDate && (
                      <Text className="text-sm text-gray-500">
                        Last payment: {item.lastPaymentDate} (₹{item.lastPaymentAmount?.toLocaleString() || 0})
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-10">
                <Text className="text-gray-500 text-lg mb-4">No vendors found</Text>
                <LottieView
                  source={require('../../assets/animations/empty_vendors.json')}
                  style={{ width: 200, height: 200 }}
                  autoPlay
                  loop
                />
              </View>
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-lg mb-4">No vendors found</Text>
            <LottieView
              source={require('../../assets/animations/empty_vendors.json')}
              style={{ width: 200, height: 200 }}
              autoPlay
              loop
            />
          </View>
        )}
      </View>
    );
  };

  // Vendor Payments Detail View
  const renderVendorPaymentsDetail = () => {
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
          
          {/* Outstanding Balance */}
          <View className="mt-2">
            <Text className="text-gray-500">Outstanding Balance</Text>
            <Text className="text-xl font-bold text-red-600">₹{selectedVendor.remainingBalance?.toLocaleString() || '0'}</Text>
          </View>
          
          {/* Add Payment Button */}
          <TouchableOpacity
            className="bg-green-600 px-4 py-2 rounded-lg mt-4 flex-row justify-center items-center"
            onPress={openPaymentModal}
          >
            <Ionicons name="cash-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Add Payment</Text>
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
          {/* Payments Section */}
          {loadingPayments ? (
            <View className="flex-1 justify-center items-center py-10">
              <ActivityIndicator size="large" color="#ca7353" />
              <Text className="mt-2 text-gray-600">Loading payments...</Text>
            </View>
          ) : vendorPayments.length > 0 ? (
            <View className="mb-6">
              <View className="flex-row justify-between items-center px-4 mb-2">
                <Text className="text-lg font-semibold text-gray-800">Payment History</Text>
                <Text className="text-sm text-gray-500">{vendorPayments.length} payments</Text>
              </View>
              
              <FlatList
                data={vendorPayments}
                keyExtractor={(item: Payment) => item.id}
                className="px-4"
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-gray-500 text-sm">Payment Date</Text>
                        <Text className="font-medium text-gray-800">{item.date}</Text>
                      </View>
                      <View>
                        <Text className="text-gray-500 text-sm">Amount</Text>
                        <Text className="font-bold text-green-600">₹{item.amount.toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            </View>
          ) : (
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-gray-500 text-lg mb-4">No payment history</Text>
              <LottieView
                source={require('../../assets/animations/empty_transactions.json')}
                style={{ width: 200, height: 200 }}
                autoPlay
                loop
              />
              <TouchableOpacity
                className="bg-green-600 px-4 py-2 rounded-lg mt-4"
                onPress={openPaymentModal}
              >
                <Text className="text-white font-semibold">Add First Payment</Text>
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
          <Text className="text-xl font-bold text-gray-800">Vendor Payments</Text>
        </View>
      </View>
      
      {/* Content */}
      {selectedVendor ? renderVendorPaymentsDetail() : renderVendorList()}
      
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
              <View className="flex-row items-center">
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 flex-1"
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="YYYY-MM-DD"
                  editable={false} // Make it read-only since we're using the date picker
                />
                <Pressable 
                  className="ml-2 bg-gray-200 p-2 rounded-lg"
                  onPress={() => {
                    // Show the date picker
                    setShowDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={24} color="#374151" />
                </Pressable>
              </View>
              
              {/* Date Picker */}
              {showDatePicker && (
                <DateTimePicker
                  value={datePickerDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()} // Can't select future dates
                />
              )}
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
                className="rounded-lg py-2 px-4"
                style={{ backgroundColor: '#ca7353' }}
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
