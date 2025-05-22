import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import CustomTabBar from '../../components/CustomTabBar';

// Import PDF services
import { generateAndSharePDF } from '../../Firebase/pdfService';

// Import Firebase services
import { resetAllData, resetCollectionData } from '../../Firebase/resetService';
import { getMonthlySummary } from '../../Firebase/summaryService';
import { getVendors, getVendorTransactions } from '../../Firebase/vendorService';
import { getCustomers, getCustomerTransactions } from '../../Firebase/customerService';
import { getVendorPayments } from '../../Firebase/vendorPaymentService';

// Type definitions now in react-native-html-to-pdf.d.ts

// Define types for service responses
interface ResetResponse {
  success: boolean;
  message: string;
}

interface FirebaseResponse<T> {
  data: T;
  error: string | null;
}

export default function SettingsScreen() {
  const router = useRouter();
  
  // Settings state
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [currency, setCurrency] = useState('₹');
  
  // Reset state
  const [isResetting, setIsResetting] = useState(false);
  const [resetOption, setResetOption] = useState('all'); // 'all', 'vendors', 'customers', 'payments'
  
  // PDF Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('');
  const [timePeriod, setTimePeriod] = useState('monthly'); // 'monthly', 'quarterly', 'yearly'

  // Handle theme toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // In a real app, you would apply the theme change here
  };

  // Handle backup
  const handleBackup = () => {
    Alert.alert(
      "Backup Data",
      "Your data will be backed up to the cloud. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Backup", 
          onPress: () => {
            // Show success message
            setTimeout(() => {
              Alert.alert("Success", "Your data has been backed up successfully!");
            }, 1000);
          } 
        }
      ]
    );
  };

  // Handle data reset
  const handleReset = () => {
    Alert.alert(
      "Reset Data",
      "This will delete all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset All Data", 
          style: "destructive",
          onPress: async () => {
            await performReset('all');
          } 
        },
        {
          text: "Choose Data to Reset",
          onPress: () => {
            showResetOptions();
          }
        }
      ]
    );
  };
  
  // Show reset options dialog
  const showResetOptions = () => {
    Alert.alert(
      "Choose Data to Reset",
      "Select which data you want to reset:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Vendors & Transactions", 
          style: "destructive",
          onPress: async () => {
            await performReset('vendors');
          } 
        },
        { 
          text: "Customers & Transactions", 
          style: "destructive",
          onPress: async () => {
            await performReset('customers');
          } 
        },
        { 
          text: "Vendor Payments", 
          style: "destructive",
          onPress: async () => {
            await performReset('vendor_payments');
          } 
        }
      ]
    );
  };
  
  // Perform the actual reset
  const performReset = async (option: string) => {
    try {
      setIsResetting(true);
      setResetOption(option);
      
      let result: ResetResponse;
      
      if (option === 'all') {
        result = await resetAllData() as ResetResponse;
      } else {
        result = await resetCollectionData(option) as ResetResponse;
      }
      
      if (result.success) {
        Alert.alert(
          "Success", 
          result.message,
          [{ text: "OK" }]
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      Alert.alert(
        "Error", 
        `Failed to reset data: ${error.message || 'Unknown error'}`,
        [{ text: "OK" }]
      );
    } finally {
      setIsResetting(false);
    }
  };
  
  // Get current year and month
  const getSelectedYearMonth = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1 // JavaScript months are 0-indexed
    };
  };
  
  // Function to show time period selection dialog
  const showTimePeriodOptions = (reportType: 'vendors' | 'customers' | 'overall' | 'vendor_payments') => {
    Alert.alert(
      "Select Time Period",
      "Choose a time period for the report:",
      [
        { 
          text: "Monthly", 
          onPress: () => {
            setTimePeriod('monthly');
            handleExportData(reportType, 'monthly');
          },
          style: "default"
        },
        { 
          text: "Quarterly", 
          onPress: () => {
            setTimePeriod('quarterly');
            handleExportData(reportType, 'quarterly');
          },
          style: "default"
        },
        { 
          text: "Yearly", 
          onPress: () => {
            setTimePeriod('yearly');
            handleExportData(reportType, 'yearly');
          },
          style: "default"
        },
        { 
          text: "Cancel", 
          style: "cancel",
          isPreferred: false
        }
      ],
      {
        cancelable: true,
        userInterfaceStyle: 'light'
      }
    );
  };

  // Function to handle PDF export
  const handleExportData = async (
    exportType: 'vendors' | 'customers' | 'overall' | 'vendor_payments',
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ) => {
    // Delegate to the PDF service to handle the entire PDF generation and sharing process
    await generateAndSharePDF(
      exportType,
      currency,
      setIsExporting,
      setExportType,
      period
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#f5e9e2' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-16 pb-4 px-4 shadow-sm">
        <Text className="text-xl font-bold text-gray-800">Settings</Text>
      </View>
      
      <ScrollView className="flex-1 px-4 py-4">
        {/* App Preferences Section */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">App Preferences</Text>
        
        <View className="bg-white rounded-xl shadow-sm mb-6">
          {/* Dark Mode Toggle */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="moon-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: "#e5e7eb", true: "#d88c9a" }}
              thumbColor="#ffffff"
            />
          </View>
          
          {/* Notifications Toggle */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="notifications-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#e5e7eb", true: "#d88c9a" }}
              thumbColor="#ffffff"
            />
          </View>
          
          {/* Currency Selection */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => {
              Alert.alert(
                "Currency",
                "Select your preferred currency",
                [
                  { text: "₹ (INR)", onPress: () => setCurrency('₹') },
                  { text: "$ (USD)", onPress: () => setCurrency('$') },
                  { text: "€ (EUR)", onPress: () => setCurrency('€') },
                  { text: "Cancel", style: "cancel" }
                ]
              );
            }}
          >
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="cash-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Currency</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-600 mr-2">{currency}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Data Management Section */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">Data Management</Text>
        
        <View className="bg-white rounded-xl shadow-sm mb-6">
          {/* Auto Backup Toggle */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="cloud-upload-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Auto Backup</Text>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={setAutoBackup}
              trackColor={{ false: "#e5e7eb", true: "#d88c9a" }}
              thumbColor="#ffffff"
            />
          </View>
          
          {/* Manual Backup Button */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-gray-100"
            onPress={handleBackup}
          >
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="save-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Backup Now</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
          
          {/* Reset Data Button */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={handleReset}
            disabled={isResetting}
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 p-2 rounded-full mr-3">
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <View>
                <Text className="text-red-600 font-medium">Reset All Data</Text>
                {isResetting && (
                  <Text className="text-xs text-gray-500">
                    Resetting {resetOption === 'all' ? 'all data' : resetOption}...
                  </Text>
                )}
              </View>
            </View>
            {isResetting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Export Section */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">Export Data as PDF</Text>
        
        <View className="bg-white rounded-xl shadow-sm mb-6">
          {/* Export options start here */}

          {/* Overall Summary Export */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-gray-100"
            onPress={() => showTimePeriodOptions('overall')}
            disabled={isExporting}
          >
            <View className="flex-row items-center">
              <View className="bg-indigo-100 p-2 rounded-full mr-3">
                <Ionicons name="stats-chart-outline" size={20} color="#6366f1" />
              </View>
              <View>
                <Text className="text-gray-800 font-medium">Overall Summary</Text>
                {isExporting && exportType === 'overall' && (
                  <Text className="text-xs text-gray-500">Generating PDF...</Text>
                )}
              </View>
            </View>
            {isExporting && exportType === 'overall' ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            )}
          </TouchableOpacity>
          
          {/* Vendor Payments Export */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => showTimePeriodOptions('vendor_payments')}
            disabled={isExporting}
          >
            <View className="flex-row items-center">
              <View className="bg-rose-100 p-2 rounded-full mr-3">
                <Ionicons name="card-outline" size={20} color="#e11d48" />
              </View>
              <View>
                <Text className="text-gray-800 font-medium">Vendor Payments</Text>
                {isExporting && exportType === 'vendor_payments' && (
                  <Text className="text-xs text-gray-500">Generating PDF...</Text>
                )}
              </View>
            </View>
            {isExporting && exportType === 'vendor_payments' ? (
              <ActivityIndicator size="small" color="#e11d48" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            )}
          </TouchableOpacity>
          
          {/* Vendor Transactions Export */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-gray-100"
            onPress={() => showTimePeriodOptions('vendors')}
            disabled={isExporting}
          >
            <View className="flex-row items-center">
              <View className="bg-orange-100 p-2 rounded-full mr-3">
                <Ionicons name="cube-outline" size={20} color="#f97316" />
              </View>
              <View>
                <Text className="text-gray-800 font-medium">Vendor Transactions</Text>
                {isExporting && exportType === 'vendors' && (
                  <Text className="text-xs text-gray-500">Generating PDF...</Text>
                )}
              </View>
            </View>
            {isExporting && exportType === 'vendors' ? (
              <ActivityIndicator size="small" color="#f97316" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            )}
          </TouchableOpacity>
          
          {/* Customer Transactions Export */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-gray-100"
            onPress={() => showTimePeriodOptions('customers')}
            disabled={isExporting}
          >
            <View className="flex-row items-center">
              <View className="bg-blue-100 p-2 rounded-full mr-3">
                <Ionicons name="person-outline" size={20} color="#3b82f6" />
              </View>
              <View>
                <Text className="text-gray-800 font-medium">Customer Transactions</Text>
                {isExporting && exportType === 'customers' && (
                  <Text className="text-xs text-gray-500">Generating PDF...</Text>
                )}
              </View>
            </View>
            {isExporting && exportType === 'customers' ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            )}
          </TouchableOpacity>
          
          {/* Other export options can be added here if needed */}
          
          
        </View>
        
        {/* Account Section */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">Account</Text>
        
        <View className="bg-white rounded-xl shadow-sm mb-6">
          {/* Logout Button */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => router.push('/authentication/logout')}
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 p-2 rounded-full mr-3">
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>
              <Text className="text-red-600 font-medium">Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        
        {/* About Section */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">About</Text>
        
        <View className="bg-white rounded-xl shadow-sm mb-6">
          {/* App Version */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="information-circle-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Version</Text>
            </View>
            <Text className="text-gray-600">1.0.0</Text>
          </View>
          
          {/* Contact Support */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-gray-100"
            onPress={() => Linking.openURL('mailto:support@example.com')}
          >
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="mail-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
          
          {/* Privacy Policy */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => Linking.openURL('https://example.com/privacy')}
          >
            <View className="flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <Ionicons name="shield-outline" size={20} color="#374151" />
              </View>
              <Text className="text-gray-800 font-medium">Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Custom Tab Bar */}
      <CustomTabBar />
    </View>
  );
}
