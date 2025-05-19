import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';

// Define interfaces for our data structures
interface Item {
  name: string;
  quantity: string;
  unitPrice: string;
}

interface Payment {
  date: string;
  amount: string;
}

// Customer Transaction Form Component
export default function CustomerTransactionScreen() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(new Date());
  const [showSaleDatePicker, setShowSaleDatePicker] = useState(false);
  const [items, setItems] = useState<Item[]>([{ name: '', quantity: '', unitPrice: '' }]);
  const [isManualMaterialAmount, setIsManualMaterialAmount] = useState(false);
  const [materialAmount, setMaterialAmount] = useState('');
  const [payments, setPayments] = useState<Payment[]>([{ date: new Date().toISOString().split('T')[0], amount: '' }]);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState<number | null>(null);
  
  // Calculate items total
  const calculateItemsTotal = () => {
    return items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0');
      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
  };

  // Get material amount (auto or manual)
  const getMaterialAmount = () => {
    if (isManualMaterialAmount) {
      return parseFloat(materialAmount || '0');
    } else {
      return calculateItemsTotal();
    }
  };
  
  // Calculate total amount
  const calculateTotal = () => {
    // If material amount is auto-calculated, it's already the items total
    // so we don't need to add items total separately
    if (!isManualMaterialAmount) {
      return getMaterialAmount().toFixed(2);
    } else {
      // If manual material amount, add it to the items total
      const itemsTotal = calculateItemsTotal();
      const material = getMaterialAmount();
      return (itemsTotal + (isNaN(material) ? 0 : material)).toFixed(2);
    }
  };

  // Calculate total payments
  const calculatePayments = () => {
    return payments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0).toFixed(2);
  };

  // Calculate balance
  const calculateBalance = () => {
    const total = parseFloat(calculateTotal());
    const paid = parseFloat(calculatePayments());
    return (total - paid).toFixed(2);
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: '', unitPrice: '' }]);
  };

  const updateItem = (index: number, field: keyof Item, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    
    // Update material amount if not in manual mode
    if (!isManualMaterialAmount) {
      // We don't need to set materialAmount here as getMaterialAmount() will calculate it dynamically
    }
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const addPayment = () => {
    setPayments([...payments, { date: new Date().toISOString().split('T')[0], amount: '' }]);
  };

  const updatePayment = (index: number, field: keyof Payment, value: string) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      const newPayments = [...payments];
      newPayments.splice(index, 1);
      setPayments(newPayments);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-100"
    >
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-16 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Customer Transaction</Text>
        </View>
      </View>
      
      <ScrollView className="flex-1 px-4 pt-6">
        {/* Customer Name */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Customer Name</Text>
          <TextInput
            className="bg-white p-3 rounded-lg border border-gray-300"
            placeholder="Enter customer name"
            value={customerName}
            onChangeText={setCustomerName}
          />
        </View>
        
        {/* Sale Date */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Sale Date</Text>
          <TouchableOpacity 
            className="bg-white p-3 rounded-lg border border-gray-300 flex-row justify-between items-center"
            onPress={() => setShowSaleDatePicker(true)}
          >
            <Text>{saleDate.toLocaleDateString()}</Text>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {showSaleDatePicker && (
            <DateTimePicker
              value={saleDate}
              mode="date"
              display="default"
              onChange={(event: any, selectedDate?: Date) => {
                setShowSaleDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setSaleDate(selectedDate);
                }
              }}
            />
          )}
        </View>
        
        {/* Items List */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Items</Text>
          {items.map((item, index) => (
            <View key={index} className="bg-white p-3 rounded-lg border border-gray-300 mb-2">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-medium">Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              
              <TextInput
                className="bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2"
                placeholder="Item name"
                value={item.name}
                onChangeText={(value) => updateItem(index, 'name', value)}
              />
              
              <View className="flex-row gap-2">
                <TextInput
                  className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex-1"
                  placeholder="Quantity"
                  keyboardType="numeric"
                  value={item.quantity}
                  onChangeText={(value) => updateItem(index, 'quantity', value)}
                />
                <TextInput
                  className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex-1"
                  placeholder="Unit Price"
                  keyboardType="numeric"
                  value={item.unitPrice}
                  onChangeText={(value) => updateItem(index, 'unitPrice', value)}
                />
              </View>
            </View>
          ))}
          
          <TouchableOpacity 
            onPress={addItem}
            className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex-row justify-center items-center"
          >
            <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
            <Text className="text-blue-600 font-medium ml-2">Add Item</Text>
          </TouchableOpacity>
        </View>
        
        {/* Material Amount */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-gray-700 font-medium">Material Amount</Text>
            <TouchableOpacity 
              onPress={() => {
                setIsManualMaterialAmount(!isManualMaterialAmount);
                if (!isManualMaterialAmount) {
                  // Switching to manual - set initial value to current auto calculation
                  setMaterialAmount(calculateItemsTotal().toString());
                }
              }}
              className="bg-gray-200 px-2 py-1 rounded-md"
            >
              <Text className="text-xs text-gray-700">
                {isManualMaterialAmount ? 'Switch to Auto' : 'Switch to Manual'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {isManualMaterialAmount ? (
            <TextInput
              className="bg-white p-3 rounded-lg border border-gray-300"
              placeholder="Enter material amount"
              keyboardType="numeric"
              value={materialAmount}
              onChangeText={setMaterialAmount}
            />
          ) : (
            <View className="bg-gray-100 p-3 rounded-lg border border-gray-300 flex-row justify-between items-center">
              <Text className="text-gray-700">₹{calculateItemsTotal().toFixed(2)}</Text>
              <Text className="text-xs text-gray-500">(Auto-calculated)</Text>
            </View>
          )}
        </View>
        
        {/* Payments Section */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Payments</Text>
          {payments.map((payment, index) => (
            <View key={index} className="bg-white p-3 rounded-lg border border-gray-300 mb-2">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-medium">Payment {index + 1}</Text>
                {payments.length > 1 && (
                  <TouchableOpacity onPress={() => removePayment(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity 
                  className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex-1 flex-row justify-between items-center"
                  onPress={() => setShowPaymentDatePicker(index)}
                >
                  <Text>{payment.date}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                </TouchableOpacity>
                {showPaymentDatePicker === index && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                      setShowPaymentDatePicker(null);
                      if (selectedDate) {
                        updatePayment(index, 'date', selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
              </View>
              
              <TextInput
                className="bg-gray-50 p-2 rounded-lg border border-gray-200"
                placeholder="Amount"
                keyboardType="numeric"
                value={payment.amount}
                onChangeText={(value) => updatePayment(index, 'amount', value)}
              />
            </View>
          ))}
          
          <TouchableOpacity 
            onPress={addPayment}
            className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex-row justify-center items-center"
          >
            <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
            <Text className="text-blue-600 font-medium ml-2">Add Payment</Text>
          </TouchableOpacity>
        </View>
        
        {/* Summary */}
        <View className="bg-white p-4 rounded-lg border border-gray-300 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700 font-medium">Total Amount</Text>
            <Text className="text-lg font-bold text-gray-800">₹{calculateTotal()}</Text>
          </View>
          
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700 font-medium">Total Paid</Text>
            <Text className="text-lg font-bold text-green-600">₹{calculatePayments()}</Text>
          </View>
          
          <View className="pt-2 border-t border-gray-200 flex-row justify-between items-center">
            <Text className="text-gray-700 font-medium">Balance</Text>
            <Text className="text-lg font-bold text-red-600">₹{calculateBalance()}</Text>
          </View>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity 
          className="bg-blue-600 p-4 rounded-lg mb-8 flex-row justify-center items-center"
        >
          <Ionicons name="save-outline" size={20} color="white" />
          <Text className="text-white font-bold ml-2">Save Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
