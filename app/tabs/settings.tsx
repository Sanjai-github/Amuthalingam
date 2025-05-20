import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import CustomTabBar from '../../components/CustomTabBar';

export default function SettingsScreen() {
  const router = useRouter();
  
  // Settings state
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [currency, setCurrency] = useState('₹');

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
      "This will delete all your local data. This action cannot be undone. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: () => {
            // Show confirmation
            setTimeout(() => {
              Alert.alert("Success", "Your data has been reset successfully!");
            }, 1000);
          } 
        }
      ]
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
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 p-2 rounded-full mr-3">
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <Text className="text-red-600 font-medium">Reset All Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
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
