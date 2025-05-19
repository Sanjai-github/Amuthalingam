import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Modal,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

// Sample vendor data for autocomplete
const sampleVendors = [
  'Acme Supplies',
  'BuildMart',
  'City Builders',
  'Decor World',
  'Elite Materials',
  'Future Construction'
];

// Sample item suggestions
const sampleItems = [
  'Cement',
  'Sand',
  'Bricks',
  'Steel',
  'Paint',
  'Tiles',
  'Pipes',
  'Wires',
  'Wood',
  'Glass'
];

export default function VendorTransactionScreen() {
  const router = useRouter();
  
  // Form state
  const [vendorName, setVendorName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [items, setItems] = useState([{ name: '', quantity: '', unitPrice: '' }]);
  const [isManualMaterialAmount, setIsManualMaterialAmount] = useState(false);
  const [materialAmount, setMaterialAmount] = useState('');
  const [transportCharge, setTransportCharge] = useState('');
  
  // UI state
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState<number | null>(null);
  const [itemSuggestions, setItemSuggestions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
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

  // Filter vendors based on input
  useEffect(() => {
    if (vendorName.length > 0) {
      const filtered = sampleVendors.filter(vendor => 
        vendor.toLowerCase().includes(vendorName.toLowerCase())
      );
      setVendorSuggestions(filtered);
    } else {
      setVendorSuggestions([]);
    }
  }, [vendorName]);

  // Filter items based on input
  const filterItemSuggestions = (text: string, index: number) => {
    if (text.length > 0) {
      const filtered = sampleItems.filter(item => 
        item.toLowerCase().includes(text.toLowerCase())
      );
      setItemSuggestions(filtered);
      setShowItemSuggestions(index);
    } else {
      setShowItemSuggestions(null);
    }
  };

  // Handle save transaction
  const handleSave = () => {
    // Validate form
    if (!vendorName.trim()) {
      Alert.alert('Error', 'Please enter a vendor name');
      return;
    }

    if (items.some(item => !item.name.trim() || !item.quantity.trim() || !item.unitPrice.trim())) {
      Alert.alert('Error', 'Please complete all item details');
      return;
    }

    // Show saving indicator
    setIsSaving(true);

    // Simulate saving to database
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert(
        'Success', 
        'Transaction saved successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: '#f5e9e2' }}
    >
      <StatusBar style="dark" />
      
      {/* Header */}
      <LinearGradient
        colors={['#ffffff', '#f8f8f8']}
        className="pt-16 pb-4 px-4 shadow-sm"
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Vendor Transaction</Text>
        </View>
      </LinearGradient>
      
      <ScrollView className="flex-1 px-4 pt-6">
        {/* Vendor Name with Autocomplete */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Vendor Name</Text>
          <View className="relative">
            <View className="flex-row items-center bg-white p-3 rounded-lg border border-gray-300">
              <Ionicons name="business-outline" size={20} color="#9ca3af" className="mr-2" />
              <TextInput
                className="flex-1"
                placeholder="Enter vendor name"
                value={vendorName}
                onChangeText={(text) => {
                  setVendorName(text);
                  setShowVendorSuggestions(text.length > 0);
                }}
                onFocus={() => setShowVendorSuggestions(vendorName.length > 0)}
              />
              {vendorName.length > 0 && (
                <TouchableOpacity onPress={() => setVendorName('')}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Vendor Suggestions */}
            {showVendorSuggestions && vendorSuggestions.length > 0 && (
              <View className="absolute top-full left-0 right-0 bg-white rounded-lg border border-gray-300 mt-1 z-10 max-h-40 overflow-hidden">
                {vendorSuggestions.slice(0, 5).map((item) => (
                  <TouchableOpacity 
                    key={item}
                    className="p-3 border-b border-gray-100"
                    onPress={() => {
                      setVendorName(item);
                      setShowVendorSuggestions(false);
                    }}
                  >
                    <Text>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        
        {/* Purchase Date */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Purchase Date</Text>
          <TouchableOpacity 
            className="bg-white p-3 rounded-lg border border-gray-300 flex-row justify-between items-center"
            onPress={() => setShowDatePicker(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={20} color="#d88c9a" className="mr-2" />
              <Text>{purchaseDate.toISOString().split('T')[0]}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={purchaseDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setPurchaseDate(selectedDate);
                }
              }}
            />
          )}
        </View>
        
        {/* Items */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-1">Items</Text>
          {items.map((item, index) => (
            <View key={index} className="bg-white p-3 rounded-lg border border-gray-300 mb-2 shadow-sm">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center">
                  <View className="bg-blue-100 w-6 h-6 rounded-full items-center justify-center mr-2">
                    <Text className="text-blue-600 font-medium">{index + 1}</Text>
                  </View>
                  <Text className="font-medium text-gray-700">Item Details</Text>
                </View>
                {items.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removeItem(index)}
                    className="bg-red-50 p-1 rounded-full"
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Item name with autocomplete */}
              <View className="relative mb-2">
                <View className="flex-row items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <Ionicons name="cube-outline" size={18} color="#9ca3af" className="mr-2" />
                  <TextInput
                    className="flex-1"
                    placeholder="Item name"
                    value={item.name}
                    onChangeText={(value) => {
                      updateItem(index, 'name', value);
                      filterItemSuggestions(value, index);
                    }}
                    onFocus={() => {
                      if (item.name.length > 0) {
                        filterItemSuggestions(item.name, index);
                      }
                    }}
                  />
                </View>
                
                {/* Item Suggestions */}
                {showItemSuggestions === index && itemSuggestions.length > 0 && (
                  <View className="absolute top-full left-0 right-0 bg-white rounded-lg border border-gray-300 mt-1 z-10 max-h-32 overflow-hidden">
                    {itemSuggestions.slice(0, 5).map((suggestion) => (
                      <TouchableOpacity 
                        key={suggestion}
                        className="p-2 border-b border-gray-100"
                        onPress={() => {
                          updateItem(index, 'name', suggestion);
                          setShowItemSuggestions(null);
                        }}
                      >
                        <Text>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1 ml-1">Quantity</Text>
                  <TextInput
                    className="bg-gray-50 p-2 rounded-lg border border-gray-200"
                    placeholder="Quantity"
                    keyboardType="numeric"
                    value={item.quantity}
                    onChangeText={(value) => updateItem(index, 'quantity', value)}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1 ml-1">Unit Price (₹)</Text>
                  <TextInput
                    className="bg-gray-50 p-2 rounded-lg border border-gray-200"
                    placeholder="Unit Price"
                    keyboardType="numeric"
                    value={item.unitPrice}
                    onChangeText={(value) => updateItem(index, 'unitPrice', value)}
                  />
                </View>
              </View>
              
              {/* Item total */}
              {(item.quantity && item.unitPrice) ? (
                <View className="flex-row justify-end mt-2">
                  <Text className="text-sm text-gray-500">
                    Total: <Text className="font-medium text-gray-700">₹{(parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')).toFixed(2)}</Text>
                  </Text>
                </View>
              ) : null}
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
          <View className="flex-row items-center bg-white p-3 rounded-lg border border-gray-300">
            <Ionicons name="car-outline" size={20} color="#9ca3af" className="mr-2" />
            <TextInput
              className="flex-1"
              placeholder="Enter transportation charge"
              keyboardType="numeric"
              value={transportCharge}
              onChangeText={setTransportCharge}
            />
          </View>
        </View>
        
        {/* Total Cost */}
        <View className="bg-white p-4 rounded-lg border border-gray-300 mb-4 shadow-sm">
          <Text className="text-gray-700 font-medium">Total Cost</Text>
          <Text className="text-2xl font-bold text-gray-800">₹{totalCost()}</Text>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity 
          className="bg-[#ca7353] p-4 rounded-lg mb-8 flex-row justify-center items-center shadow-sm"
          onPress={handleSave}
          disabled={isSaving}
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" />
              <Text className="text-white font-medium text-base ml-2">Save Transaction</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
