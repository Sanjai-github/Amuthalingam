import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import CustomTabBar from '../../components/CustomTabBar';
import ErrorBoundary from '../../components/ErrorBoundary';

// Import Firebase services
import { getVendors, getVendorTransactions, getSingleVendorOutstandingBalance } from '../../Firebase/vendorService';
import { getVendorRemainingBalance } from '../../Firebase/vendorPaymentService.js';

// Define types for Firebase service responses
interface FirebaseResponse<T> {
  data: T;
  error: string | null;
  lastVisible?: any;
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

// Define interfaces for our data structures
// Firebase data structure for vendor transaction items
interface FirebaseVendorTransactionItem {
  name: string;
  quantity: number | string;
  unit_price: number | string;
}

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
  remainingBalance?: number;
  lastTransactionDate?: string;
  transactions?: VendorTransaction[];
  payments?: Payment[];
}

export default function VendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorTransactions, setVendorTransactions] = useState<VendorTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Pagination state
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Transaction pagination state
  const [lastVisibleTransaction, setLastVisibleTransaction] = useState<any>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => 
    vendor.name && vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch vendors from Firebase with pagination
  const fetchVendors = async (refresh = false) => {
    try {
      if (refresh) {
        setIsLoading(true);
        setLastVisible(null);
        setHasMore(true);
      } else if (!hasMore) {
        return;
      }

      setLoadingMore(!refresh);

      // Explicitly type the response to include lastVisible property
      const response: FirebaseResponse<any[]> & { lastVisible?: any } = await getVendors();
      
      if (response.error) {
        console.error('Error fetching vendors:', response.error);
        setVendors([]);
        return;
      }
      
      // Process the vendors data
      const vendorsList: Vendor[] = await Promise.all(response.data.map(async (vendor) => {
        // Get outstanding balance for each vendor
        const balanceResult = await getSingleVendorOutstandingBalance(vendor.id);
        const totalOwed = balanceResult.error ? 0 : balanceResult.data;
        
        // Get remaining balance after payments
        const remainingBalanceResult = await getVendorRemainingBalance(vendor.id) as FirebaseResponse<number>;
        const remainingBalance = remainingBalanceResult.error ? totalOwed : remainingBalanceResult.data;
        
        return {
          id: vendor.id,
          name: vendor.name || '',
          totalSpent: vendor.totalSpent || 0,
          totalOwed: totalOwed,
          remainingBalance: remainingBalance,
          lastTransactionDate: vendor.lastTransactionDate || '',
          payments: [],
          transactions: [] // We'll load transactions only when a vendor is selected
        };
      }));
      
      // Update the state based on whether this is a refresh or loading more
      if (refresh) {
        setVendors(vendorsList);
      } else {
        setVendors([...vendors, ...vendorsList]);
      }
      
      // Only set lastVisible if it exists in the response
      if (response.lastVisible) {
        setLastVisible(response.lastVisible);
      }
      
      // For demonstration purposes, set pagination values
      setHasMore(vendorsList.length >= 10);
      
    } catch (error) {
      console.error('Error fetching vendors:', error);
      Alert.alert('Error', 'Failed to load vendors. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors(true);
  }, []);
  
  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchVendors(true);
  };
  
  // Handle loading more vendors when reaching the end of the list
  const loadMoreVendors = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      // Call getVendors without parameters as defined in the function signature
      // Explicitly type the response to include lastVisible property
      const response: FirebaseResponse<any[]> & { lastVisible?: any } = await getVendors();
      
      if (response.data.length === 0) {
        setHasMore(false);
      } else {
        // Ensure the response data conforms to the Vendor interface
        const typedVendors: Vendor[] = await Promise.all(response.data.map(async (vendor: any) => {
          // Get outstanding balance for each vendor
          const balanceResult = await getSingleVendorOutstandingBalance(vendor.id);
          const totalOwed = balanceResult.error ? 0 : balanceResult.data;
          
          // Get remaining balance after payments
          const remainingBalanceResult = await getVendorRemainingBalance(vendor.id) as FirebaseResponse<number>;
          const remainingBalance = remainingBalanceResult.error ? totalOwed : remainingBalanceResult.data;
          
          return {
            id: vendor.id,
            name: vendor.name || '',
            totalSpent: vendor.totalSpent || 0,
            totalOwed: totalOwed,
            remainingBalance: remainingBalance,
            lastTransactionDate: vendor.lastTransactionDate || '',
            payments: [],
            transactions: []
          };
        }));
        
        setVendors([...vendors, ...typedVendors]);
        
        // Only set lastVisible if it exists in the response
        if (response.lastVisible) {
          setLastVisible(response.lastVisible);
        } else {
          // If no pagination info is returned, assume no more data
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading more vendors:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddTransaction = () => {
    router.push('/forms/vendor-transaction-form');
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorTransactions([]);
    setLoadingTransactions(true);
    fetchVendorTransactions(vendor.id);
  };

  const fetchVendorTransactions = async (vendorId: string) => {
    try {
      // Fetch transactions for the selected vendor
      const result = await getVendorTransactions(vendorId);
      
      if (result.error) {
        console.error('Error fetching vendor transactions:', result.error);
        return;
      }
      
      // Transform the data to match our VendorTransaction interface
      const transformedTransactions: VendorTransaction[] = result.data.map((transaction: any) => ({
        id: transaction.id,
        date: transaction.date,
        items: transaction.items.map((item: FirebaseVendorTransactionItem) => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unitPrice: item.unit_price.toString()
        })),
        materialAmount: transaction.material_amount,
        transportCharge: transaction.transport_charge || 0,
        totalAmount: transaction.total_amount
      }));
      
      setVendorTransactions(transformedTransactions);
      
      // For demonstration purposes, set pagination values
      setHasMoreTransactions(transformedTransactions.length >= 10);
      
    } catch (error) {
      console.error('Error selecting vendor:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Load more transactions when reaching the end of the transactions list
  const loadMoreTransactions = useCallback(() => {
    if (!loadingTransactions && !loadingMoreTransactions && hasMoreTransactions && selectedVendor) {
      // In the future, this will load more transactions with pagination
      console.log('Would load more transactions here');
    }
  }, [loadingTransactions, loadingMoreTransactions, hasMoreTransactions, selectedVendor]);
  
  const handleBackToList = () => {
    setSelectedVendor(null);
  };

  // Define styles for the new transaction card design
  const styles = StyleSheet.create({
    fabButton: {
      position: 'absolute',
      bottom: 80,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#ff5a5f',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5
    },
    // App structure styles
    header: {
      backgroundColor: '#ffffff',
      paddingTop: 64,
      paddingBottom: 16,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 3
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#111827'
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: '#ffffff',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16
    },
    vendorCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      padding: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
      marginBottom: 12
    },
    vendorCardName: {
      fontWeight: 'bold',
      fontSize: 18,
      color: '#111827'
    },
    vendorCardDate: {
      color: '#6b7280',
      fontSize: 14,
      marginTop: 4
    },
    vendorTotalSpent: {
      color: '#2563eb',
      marginRight: 4,
      fontWeight: '600',
      fontSize: 16
    },
    // Vendor detail styles
    vendorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16
    },
    backButton: {
      marginRight: 12,
      padding: 4
    },
    vendorName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#111827'
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16
    },
    statCard: {
      backgroundColor: '#ebf5ff',
      padding: 16,
      borderRadius: 12,
      flex: 1,
      marginRight: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1
    },
    statCardRed: {
      backgroundColor: '#fef2f2',
      marginRight: 0,
      marginLeft: 8
    },
    statLabel: {
      color: '#1e40af',
      fontWeight: '500',
      marginBottom: 4
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1e40af'
    },
    statLabelRed: {
      color: '#b91c1c',
      fontWeight: '500',
      marginBottom: 4
    },
    statValueRed: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#b91c1c'
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 8
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    emptyStateText: {
      fontSize: 16,
      color: '#6b7280'
    },
    // Transaction card styles - Modern redesign
    card: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      marginBottom: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3
    },
    cardHeader: {
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9'
    },
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    dateText: {
      fontWeight: '600',
      fontSize: 15,
      color: '#334155',
      marginLeft: 8
    },
    amountBadge: {
      backgroundColor: '#4f46e5',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 24
    },
    amountText: {
      fontWeight: 'bold',
      fontSize: 15,
      color: '#ffffff'
    },
    cardBody: {
      padding: 16
    },
    amountBreakdown: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      backgroundColor: '#fafafa',
      padding: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1
    },
    amountColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    columnDivider: {
      borderRightWidth: 1,
      borderRightColor: '#e2e8f0'
    },
    amountLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: '#64748b',
      textTransform: 'uppercase',
      marginBottom: 4,
      letterSpacing: 0.5
    },
    amountValue: {
      fontWeight: '700',
      fontSize: 16,
      color: '#0f172a'
    },
    sectionTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 4
    },
    sectionTitleText: {
      fontWeight: '600',
      fontSize: 16,
      color: '#334155',
      marginLeft: 6
    },
    itemsTable: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#e2e8f0'
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#f8fafc',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0'
    },
    tableHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    },
    tableRow: {
      flexDirection: 'row',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6'
    },
    tableCell: {
      fontSize: 14,
      color: '#334155',
      fontWeight: '500'
    },
    col1: { 
      flex: 3 
    },
    col2: { 
      flex: 1, 
      textAlign: 'center' 
    },
    col3: { 
      flex: 1, 
      textAlign: 'right' 
    },
    col4: { 
      flex: 1, 
      textAlign: 'right' 
    }
  });

  return (
    <ErrorBoundary>
      <View style={[{flex: 1}, {backgroundColor: '#f5e9e2'}]}>
        <StatusBar style="auto" />
        
        {/* Main content */}
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vendors</Text>
        </View>
        
        <View style={{flex: 1, padding: 16}}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {isLoading && vendors.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={{marginTop: 16, color: '#6b7280'}}>Loading vendors...</Text>
            </View>
          ) : selectedVendor ? (
            <View style={{flex: 1}}>
              {/* Vendor detail view */}
              <View style={styles.vendorHeader}>
                <TouchableOpacity 
                  onPress={handleBackToList}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.vendorName}>{selectedVendor.name}</Text>
              </View>
              
              {/* Vendor stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Total Spent</Text>
                  <Text style={styles.statValue}>
                    ₹{selectedVendor.totalSpent.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statCard, styles.statCardRed]}>
                  <Text style={styles.statLabelRed}>Outstanding</Text>
                  <Text style={styles.statValueRed}>
                    ₹{selectedVendor.remainingBalance?.toLocaleString() || '0'}
                  </Text>
                </View>
              </View>
              
              {/* Transactions list */}
              <Text style={styles.sectionHeader}>Transactions</Text>
              
              {loadingTransactions ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : vendorTransactions.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="receipt-outline" size={40} color="#9ca3af" />
                  <Text style={styles.emptyStateText}>No transactions found</Text>
                </View>
              ) : (
                <FlatList
                  data={vendorTransactions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.card}>
                      {/* Transaction header with date */}
                      <View style={styles.cardHeader}>
                        <View style={styles.dateContainer}>
                          <Ionicons name="calendar" size={18} color="#3b82f6" />
                          <Text style={styles.dateText}>
                            {new Date(item.date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>
                        <View style={styles.amountBadge}>
                          <Text style={styles.amountText}>₹{item.totalAmount.toLocaleString()}</Text>
                        </View>
                      </View>
                      
                      {/* Transaction body */}
                      <View style={styles.cardBody}>
                        {/* Amount breakdown */}
                        <View style={styles.amountBreakdown}>
                          <View style={[styles.amountColumn, styles.columnDivider]}>
                            <Text style={styles.amountLabel}>MATERIAL</Text>
                            <Text style={styles.amountValue}>₹{item.materialAmount.toLocaleString()}</Text>
                          </View>
                          <View style={styles.amountColumn}>
                            <Text style={styles.amountLabel}>TRANSPORT</Text>
                            <Text style={styles.amountValue}>
                              {item.transportCharge > 0 ? `₹${item.transportCharge.toLocaleString()}` : '-'}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Items list */}
                        <View>
                          <View style={styles.sectionTitle}>
                            <Ionicons name="list" size={16} color="#6b7280" />
                            <Text style={styles.sectionTitleText}>Items</Text>
                          </View>
                          
                          <View style={styles.itemsTable}>
                            {/* Table header */}
                            <View style={styles.tableHeader}>
                              <Text style={[styles.tableHeaderText, styles.col1]}>ITEM</Text>
                              <Text style={[styles.tableHeaderText, styles.col2]}>QTY</Text>
                              <Text style={[styles.tableHeaderText, styles.col3]}>PRICE</Text>
                              <Text style={[styles.tableHeaderText, styles.col4]}>TOTAL</Text>
                            </View>
                            
                            {/* Table rows */}
                            {item.items.map((itemDetail, index) => {
                              const qty = parseFloat(itemDetail.quantity);
                              const price = parseFloat(itemDetail.unitPrice);
                              const total = qty * price;
                              
                              return (
                                <View key={index} style={[styles.tableRow, {backgroundColor: index % 2 === 1 ? '#f9fafb' : '#ffffff'}]}>
                                  <Text style={[styles.tableCell, styles.col1]}>{itemDetail.name}</Text>
                                  <Text style={[styles.tableCell, styles.col2]}>{itemDetail.quantity}</Text>
                                  <Text style={[styles.tableCell, styles.col3]}>₹{itemDetail.unitPrice}</Text>
                                  <Text style={[styles.tableCell, styles.col4]}>₹{total.toLocaleString()}</Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                  onEndReached={loadMoreTransactions}
                  onEndReachedThreshold={0.5}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                />
              )}
            </View>
          ) : vendors.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <LottieView
                source={require('../../assets/animations/empty_vendors.json')}
                autoPlay
                loop
                style={{ width: 200, height: 200 }}
              />
              <Text style={styles.emptyStateText}>No vendors yet</Text>
              <Text style={{textAlign: 'center', color: '#6b7280', marginBottom: 16}}>
                Add your first vendor transaction to get started
              </Text>
              <TouchableOpacity
                onPress={handleAddTransaction}
                style={{backgroundColor: '#ff69b4', padding: 12, borderRadius: 8}}
              >
                <Text style={{color: '#ffffff', fontWeight: 'bold'}}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredVendors}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                onPress={() => {
                  // Ensure item is a complete Vendor object before passing to handleVendorSelect
                  const completeVendor: Vendor = {
                    ...item,
                    // Add any missing properties with defaults
                    name: item.name || '',
                    totalOwed: item.totalOwed || 0,
                    transactions: item.transactions || [],
                    payments: item.payments || []
                  };
                  handleVendorSelect(completeVendor);
                }}  
                style={styles.vendorCard}
              >
                <View>
                  <Text style={styles.vendorCardName}>{item.name || 'Unnamed Vendor'}</Text>
                  <Text style={styles.vendorCardDate}>
                    {item.lastTransactionDate ? 
                      `Last transaction: ${new Date(item.lastTransactionDate).toLocaleDateString()}` : 
                      (item.totalSpent > 0 ? 
                        `Has transactions (₹${item.totalSpent.toLocaleString()})` : 
                        'No transactions')}
                  </Text>
                </View>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.vendorTotalSpent}>₹{item.totalSpent.toLocaleString()}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                  </View>
                </TouchableOpacity>
              )}
              onEndReached={loadMoreVendors}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                />
              }
            />
          )}
        </View>
      </View>
      
      {/* Custom Tab Bar */}
      <CustomTabBar />
    </ErrorBoundary>
  );
}