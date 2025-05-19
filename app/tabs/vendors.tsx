import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';

// Define interfaces for our data structures
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
  transactions: VendorTransaction[];
}

// Dummy data for development
const dummyVendors: Vendor[] = [
  {
    id: '1',
    name: 'Acme Supplies',
    totalSpent: 12500,
    totalOwed: 2500,
    transactions: [
      {
        id: 't1',
        date: '2025-05-15',
        items: [
          { name: 'Cement', quantity: '10', unitPrice: '450' },
          { name: 'Sand', quantity: '5', unitPrice: '300' }
        ],
        materialAmount: 6000,
        transportCharge: 500,
        totalAmount: 6500
      },
      {
        id: 't2',
        date: '2025-05-10',
        items: [
          { name: 'Bricks', quantity: '1000', unitPrice: '6' }
        ],
        materialAmount: 6000,
        transportCharge: 0,
        totalAmount: 6000
      }
    ]
  },
  {
    id: '2',
    name: 'BuildMart',
    totalSpent: 8750,
    totalOwed: 0,
    transactions: [
      {
        id: 't3',
        date: '2025-05-12',
        items: [
          { name: 'Tiles', quantity: '50', unitPrice: '75' },
          { name: 'Grout', quantity: '2', unitPrice: '250' }
        ],
        materialAmount: 4250,
        transportCharge: 300,
        totalAmount: 4550
      },
      {
        id: 't4',
        date: '2025-05-05',
        items: [
          { name: 'Paint', quantity: '5', unitPrice: '750' },
          { name: 'Brushes', quantity: '3', unitPrice: '150' }
        ],
        materialAmount: 4200,
        transportCharge: 0,
        totalAmount: 4200
      }
    ]
  }
];

export default function VendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>(dummyVendors);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // In a real app, this would fetch vendors from Firebase
  useEffect(() => {
    // Quick initialization without artificial delay
    setIsLoading(false);
    
    // When implementing Firebase, you would fetch vendors here
    // Example:
    // const fetchVendors = async () => {
    //   const vendorsSnapshot = await firebase.firestore().collection('Vendors').get();
    //   const vendorsData = vendorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    //   setVendors(vendorsData);
    //   setIsLoading(false);
    // };
    // fetchVendors();
  }, []);

  const handleAddTransaction = () => {
    router.push('/forms/vendor-transaction');
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
  };

  const handleBackToList = () => {
    setSelectedVendor(null);
  };

  // Vendor List View
  const renderVendorList = () => (
    <>
      {/* Search Bar */}
      <View className="px-4 py-2">
        <View className="bg-white flex-row items-center px-3 py-2 rounded-lg border border-gray-300">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search vendors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Vendors List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#d88c9a" />
        </View>
      ) : filteredVendors.length > 0 ? (
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.id}
          className="px-4"
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
              onPress={() => handleVendorSelect(item)}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
                <View className="bg-orange-100 px-2 py-1 rounded-full">
                  <Text className="text-orange-800 font-medium">{item.transactions.length} Transactions</Text>
                </View>
              </View>
              
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-500 text-sm">Total Spent</Text>
                  <Text className="text-gray-800 font-bold">₹{item.totalSpent.toLocaleString()}</Text>
                </View>
                
                {item.totalOwed > 0 && (
                  <View>
                    <Text className="text-gray-500 text-sm">Outstanding</Text>
                    <Text className="text-red-600 font-bold">₹{item.totalOwed.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-4">
          <View className="w-64 h-64 mb-4">
            <LottieView
              source={require('../../assets/animations/empty_vendors.json')}
              autoPlay
              loop
            />
          </View>
          <Text className="text-lg text-gray-600 text-center mb-6">No vendors found</Text>
          <TouchableOpacity 
            className="bg-blue-600 px-6 py-3 rounded-lg"
            onPress={handleAddTransaction}
          >
            <Text className="text-white font-semibold">Add First Vendor</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // Vendor Detail View
  const renderVendorDetail = () => {
    if (!selectedVendor) return null;
    
    return (
      <View className="flex-1">
        {/* Vendor Header */}
        <View className="bg-white px-4 py-4 shadow-sm mb-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={handleBackToList} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">{selectedVendor.name}</Text>
          </View>
          
          <View className="flex-row justify-between mt-2">
            <View>
              <Text className="text-gray-500 text-sm">Total Spent</Text>
              <Text className="text-gray-800 font-bold">₹{selectedVendor.totalSpent.toLocaleString()}</Text>
            </View>
            
            {selectedVendor.totalOwed > 0 && (
              <View>
                <Text className="text-gray-500 text-sm">Outstanding</Text>
                <Text className="text-red-600 font-bold">₹{selectedVendor.totalOwed.toLocaleString()}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Transaction List */}
        <Text className="px-4 text-lg font-semibold text-gray-800 mb-2">Transaction History</Text>
        <FlatList
          data={selectedVendor.transactions}
          keyExtractor={(item) => item.id}
          className="px-4"
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-medium text-gray-800">{item.date}</Text>
                <Text className="font-bold text-gray-800">₹{item.totalAmount.toLocaleString()}</Text>
              </View>
              
              {/* Items */}
              {item.items.map((product, index) => (
                <View key={index} className="flex-row justify-between mb-1">
                  <Text className="text-gray-600">
                    {product.name} ({product.quantity} × ₹{product.unitPrice})
                  </Text>
                  <Text className="text-gray-600">
                    ₹{(parseFloat(product.quantity) * parseFloat(product.unitPrice)).toLocaleString()}
                  </Text>
                </View>
              ))}
              
              {/* Additional Charges */}
              {item.transportCharge > 0 && (
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-600">Transport Charge</Text>
                  <Text className="text-gray-600">₹{item.transportCharge.toLocaleString()}</Text>
                </View>
              )}
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#f5e9e2' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-16 pb-4 px-4 shadow-sm">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold text-gray-800">Vendors</Text>
        </View>
      </View>
      
      {/* Content */}
      {selectedVendor ? renderVendorDetail() : renderVendorList()}
      
      {/* Custom Tab Bar with Animations */}
      <CustomTabBar />
    </View>
  );
}
