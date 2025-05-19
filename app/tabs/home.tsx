import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';

export default function HomeScreen() {
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const animation = useRef<LottieView>(null);
  
  useEffect(() => {
    // Auto play the animation when component mounts
    if (animation.current) {
      animation.current.play();
    }
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
          <View>
            <Text className="text-sm text-gray-500">Welcome back</Text>
            <Text className="text-2xl font-bold text-gray-800">Dashboard</Text>
          </View>
          <View className="bg-pink-100 p-3 rounded-full">
            <Ionicons name="analytics-outline" size={24} color="#d88c9a" />
          </View>
        </View>
        <View className="h-1 w-20 bg-pink-200 rounded-full mt-1" />
      </View>
      
      <ScrollView className="flex-1 px-4">
        {/* Outstanding Balances Section */}
        <View className="flex-row items-center mb-3">
          <Text className="text-xl font-bold text-gray-800">Outstanding Balances</Text>
          <View className="h-1 w-16 bg-pink-200 rounded-full ml-3 mt-1" />
        </View>
        <View className="flex-row justify-between mb-6">
          {/* Vendor Card */}
          <View className="bg-white rounded-xl p-4 shadow-md w-[48%]">
            <View className="flex-row items-center mb-2">
              <View className="bg-orange-100 p-2 rounded-full mr-2">
                <Ionicons name="cube-outline" size={24} color="#f97316" />
              </View>
              <Text className="font-semibold text-gray-700">Vendors</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-800">₹12,500</Text>
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
            <Text className="text-2xl font-bold text-gray-800">₹18,750</Text>
            <Text className="text-sm text-gray-500">Total Due</Text>
          </View>
        </View>

        {/* Monthly Summary Section */}
        <Text className="text-xl font-bold text-gray-800 mb-3">Monthly Summary</Text>
        <View className="bg-white rounded-xl p-4 shadow-md mb-6">
          <View className="flex-row justify-between mb-4">
            {/* Income */}
            <View className="flex-row items-center">
              <View className="bg-green-100 p-2 rounded-full mr-2">
                <Ionicons name="trending-up" size={24} color="#22c55e" />
              </View>
              <View>
                <Text className="font-semibold text-gray-700">Income</Text>
                <Text className="text-xl font-bold text-green-600">₹45,000</Text>
              </View>
            </View>
            
            {/* Expenses */}
            <View className="flex-row items-center">
              <View className="bg-red-100 p-2 rounded-full mr-2">
                <Ionicons name="trending-down" size={24} color="#ef4444" />
              </View>
              <View>
                <Text className="font-semibold text-gray-700">Expenses</Text>
                <Text className="text-xl font-bold text-red-600">₹32,500</Text>
              </View>
            </View>
          </View>
          
          {/* Net Balance */}
          <View className="border-t border-gray-200 pt-3 flex-row justify-between items-center">
            <Text className="font-semibold text-gray-700">Net Balance</Text>
            <View className="flex-row items-center">
              <View className="bg-green-100 px-2 py-1 rounded-full mr-2">
                <Text className="text-green-700 font-medium">+₹12,500</Text>
              </View>
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
