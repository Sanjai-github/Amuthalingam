import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';

// Placeholder component for vendor transaction form
export default function VendorTransactionScreen() {
  const router = useRouter();
  const [vendorName, setVendorName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [items, setItems] = useState([{ name: '', quantity: '', unitPrice: '' }]);
  const [isManualMaterialAmount, setIsManualMaterialAmount] = useState(false);
  const [materialAmount, setMaterialAmount] = useState('');
  const [transportCharge, setTransportCharge] = useState('');
  
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
  
  // Calculate total cost
  const totalCost = () => {
    // If material amount is auto-calculated, it's already the items total
    // so we don't need to add items total separately
    let total = 0;
    
    if (!isManualMaterialAmount) {
      total = getMaterialAmount();
    } else {
      // If manual material amount, add it to the items total
      const itemsTotal = calculateItemsTotal();
      const material = getMaterialAmount();
      total = itemsTotal + (isNaN(material) ? 0 : material);
    }
    
    // Add transportation charge
    const transport = parseFloat(transportCharge || '0');
    return (total + (isNaN(transport) ? 0 : transport)).toFixed(2);
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: '', unitPrice: '' }]);
  };

  const updateItem = (index: number, field: 'name' | 'quantity' | 'unitPrice', value: string) => {
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
          <Text className="text-xl font-bold text-gray-800">Vendor Transaction</Text>
        </View>
      </View>
      
      <ScrollView className="flex-1 px-4 pt-6">
        {/* Vendor Name */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Vendor Name</Text>
          <TextInput
            className="bg-white p-3 rounded-lg border border-gray-300"
            placeholder="Enter vendor name"
            value={vendorName}
            onChangeText={setVendorName}
          />
        </View>
        
        {/* Purchase Date */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Purchase Date</Text>
          <TouchableOpacity 
            className="bg-white p-3 rounded-lg border border-gray-300 flex-row justify-between items-center"
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{purchaseDate.toLocaleDateString()}</Text>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={purchaseDate}
              mode="date"
              display="default"
              onChange={(event: any, selectedDate?: Date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setPurchaseDate(selectedDate);
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
        
        {/* Transportation Charge */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Transportation Charge</Text>
          <TextInput
            className="bg-white p-3 rounded-lg border border-gray-300"
            placeholder="Enter transportation charge"
            keyboardType="numeric"
            value={transportCharge}
            onChangeText={setTransportCharge}
          />
        </View>
        
        {/* Total Cost */}
        <View className="bg-white p-4 rounded-lg border border-gray-300 mb-4">
          <Text className="text-gray-700 font-medium">Total Cost</Text>
          <Text className="text-2xl font-bold text-gray-800">₹{totalCost()}</Text>
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
